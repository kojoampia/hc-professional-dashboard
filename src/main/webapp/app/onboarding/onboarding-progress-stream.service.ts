import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, defer, finalize, repeat, retry, throwError, timer } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { StateStorageService } from 'app/core/auth/state-storage.service';
import { OnboardingProgressDto } from 'app/health-connect/api/onboarding-api.service';

/**
 * The live half of the completion meter: `GET /api/onboarding/progress/stream`, read with `fetch`
 * and parsed as Server-Sent Events by hand (`backlog.md` row 230, unit B).
 *
 * <h2>⛔ Why this is not `EventSource`, and why a token in the URL is refused</h2>
 *
 * <p>`EventSource` is the obvious tool and **cannot be used here**: it sends no custom headers, and
 * this application authenticates every call with `Authorization: Bearer` set by
 * `core/interceptor/auth.interceptor.ts` — the only place in the app that sets that header on an HTTP
 * request. So `new EventSource(url)` arrives unauthenticated. **Measured on the running quality stack,
 * 2026-10-10:** the same request with no `Authorization` header answers **401**.
 *
 * <p>⛔ **The workaround everybody reaches for — a token in a query parameter — is refused, and not
 * on taste.** `?token=…` would write a JWT into every nginx access log on both hops, into browser
 * history, and into the `Referer` of anything the page subsequently loads. This estate retired an
 * *email address* from a URL for exactly that reason (`workspace/CLAUDE.md` § "Reading: two plain
 * endpoints"), and a bearer token is strictly worse than an email: it is a credential, it is replayable
 * until it expires, and the three products share one signing key, so a leaked one is accepted by
 * hc-admin and hc-patient too. ⛔ **Do not "simplify" this file back to `EventSource` plus a
 * parameter.** `onboarding-progress-stream.service.spec.ts` asserts that the request URL carries no
 * token and that the header is present, and it exists to fail that change.
 *
 * <p>⚠ There is an in-tree precedent for the same constraint reaching the same conclusion:
 * `health-connect/api/message-socket.service.ts:26` records that a WebSocket upgrade cannot carry an
 * `Authorization` header either, and solves it with STOMP `connectHeaders` rather than with a URL.
 *
 * <h2>What `fetch` costs, since it is not free</h2>
 *
 * <p>`EventSource` would have given reconnection, `Last-Event-ID` replay and framing for nothing. None
 * of the three is load-bearing here and the first is replaced:
 *
 * <ul>
 *   <li>**Reconnection** is {@link watch}'s `retry` **and** `repeat` — two operators, because
 *       `retry` covers a failure and `repeat` a clean close, and only the pair covers both.</li>
 *   <li>**Replay** is not wanted. Every frame is a whole meter, not a delta, so a missed frame is
 *       superseded by the next one; and `OnboardingProgressService` re-reads the authoritative `GET`
 *       on reconnect, which is a better recovery than replaying a queue.</li>
 *   <li>**Framing** is {@link feed}, which is small because the server's frames are: one event name
 *       and one JSON payload, plus comments.</li>
 * </ul>
 *
 * <h2>⚠ The two proxy-side facts this client depends on, and what is NOT claimed about them</h2>
 *
 * <p>Neither is visible from here and both are `api/`'s half of unit B, recorded so that a reader
 * debugging a silent stream looks in the right place:
 *
 * <ul>
 *   <li>**The 120s read timeout.** `deploy/docker/web-nginx.conf`'s
 *       `^/(api|services|management|auth|v3/api-docs|health)` location — the one this path matches —
 *       sets `proxy_read_timeout 120s` and no `proxy_buffering off`. (`/websocket`'s 3600s is a
 *       different location.) So an idle stream would be cut, and
 *       `OnboardingProgressStream.sendHeartbeats` sends an SSE **comment** every 30s against it.
 *       {@link feed} discards comments, which is the point of them: they keep the socket warm without
 *       the stream becoming a second source of the number.</li>
 *   <li>**Buffering**, where the honest statement is narrower than this comment first made it.
 *       `OnboardingResource.progressStream` answers `X-Accel-Buffering: no` — one line, free, and the
 *       sanctioned route, since nginx belongs to the architect. ⛔ **But this file claimed the stream
 *       "never arrives" without it, and that is measured false:** with a **chunked** upstream, which
 *       is exactly what `SseEmitter` produces, nginx streams SSE frames in real time with buffering
 *       **on**, through one hop and two, on 1.27.5 and 1.31.4 — the former being what
 *       `web.Dockerfile`'s **floating** `nginx:1.27-alpine` resolves to today. ⚠ Nothing pins it to
 *       stay there, so the version under test is a fact about this week, not about the artefact.
 *       The all-at-once failure needs a non-chunked `Connection: close` origin, which is not Spring's
 *       shape. The header is kept as defence in depth, not as a fix for an observed break.</li>
 * </ul>
 *
 * <p>⚠ **Two corrections worth carrying, because they would send a debugger to the wrong hop.**
 * nginx **consumes and strips** `X-Accel-Buffering`, so it can only ever affect the **inner** hop and
 * the outer one never sees it. And "the host vhost disables buffering" is true of **quality only**:
 * `quality/host-site.conf` carries `proxy_buffering off` twice, while **`buffering` appears zero times
 * in all six nginx configs in `deploy/`** — `docker/web-nginx.conf`, `prod-server/hc-professional-app.conf`,
 * `professional.abofonsa.com.conf`, its bootstrap variant and both `nginx-conf.d` fragments (measured
 * across `origin/main`, 2026-10-11). So in production **neither** hop disables it.
 */

/**
 * Whether the push is working, which is **not** whether the meter is right — see
 * `OnboardingProgressService`, where the `GET` stays authoritative.
 *
 * <p>`stalled` is the state that has to exist: a dropped SSE stream is otherwise indistinguishable
 * from a quiet one, because an idle stream and a dead stream both deliver nothing.
 *
 * <p>⛔ `refused` is **terminal** and is the only state from which nothing reconnects — see
 * {@link isPermanentRefusal}. It exists because retrying a 401 for ever is what this service did
 * before review, and "stopped asking" and "never started" must not look the same.
 */
export type OnboardingStreamState = 'idle' | 'connecting' | 'connected' | 'stalled' | 'refused';

/**
 * How long to wait before reconnecting a dropped stream.
 *
 * <p>Deliberately longer than the server's 30s heartbeat, so an outage costs one reconnect per five
 * seconds per tab and not a hot loop against a service that may be down. A fixed delay rather than an
 * exponential backoff because the meter is a courtesy: the worst case of reconnecting too eagerly is
 * noise in a log, and the worst case of backing off too far is a clinician's meter staying stale for
 * minutes after the service came back.
 */
const RECONNECT_DELAY_MS = 5_000;

/** The event name `OnboardingProgressStream.EVENT_NAME` sends. Frames with any other name are ignored. */
const EVENT_NAME = 'onboarding-progress';

/**
 * A response the server answered but refused, carrying the status so {@link isPermanentRefusal} can
 * decide whether asking again could ever help.
 *
 * <p>A class rather than a formatted message, because the status is the whole of the evidence and
 * parsing it back out of a string is how a retry rule stops matching after a wording change.
 */
class StreamRefusedError extends Error {
  constructor(readonly status: number) {
    // Lower-case diagnostic, for the reason given at the throw site.
    super(`progress-stream refused: HTTP ${status}`);
  }
}

/**
 * Whether asking again could ever help.
 *
 * <p>⛔ **401 and 403 are terminal here, and the no-backoff argument does not reach them.** A fixed
 * five-second retry is right for a transport failure — the service may be restarting and the worst
 * case is noise in a log. It is wrong for a credential the server has rejected: nothing about waiting
 * changes the answer, and because this service uses `fetch` rather than `HttpClient`, the 401 never
 * reaches `AuthExpiredInterceptor`, so nothing signs the clinician out and nothing else would stop the
 * loop. Measured before this guard: **25 requests in two simulated minutes, ~720/h per open tab**, for
 * ever, per tab.
 *
 * <p>⚠ The old comment said an absent token answering 401 was *"the right behaviour: a signed-out tab
 * has no meter to update"*. Right that it must not update — wrong that it should keep asking.
 *
 * <p>A 404 is deliberately **not** terminal: it is what a client gets against a service mid-deploy
 * whose new route has not come up yet, and that resolves on its own.
 */
function isPermanentRefusal(error: unknown): boolean {
  return error instanceof StreamRefusedError && (error.status === 401 || error.status === 403);
}

@Injectable({ providedIn: 'root' })
export class OnboardingProgressStreamService {
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly stateStorageService = inject(StateStorageService);

  private readonly connectionState = signal<OnboardingStreamState>('idle');

  /** Readable so a template can say "live" or "reconnecting" without being able to drive it. */
  readonly state = this.connectionState.asReadonly();

  private readonly reconnects = new Subject<void>();

  /**
   * Whether the stream has dropped since it was last successfully reading.
   *
   * <p>⚠ **A separate flag rather than a reading of {@link state}, and the first version got this
   * wrong.** It checked for `stalled` at the point of connecting — but `openOnce` sets `connecting`
   * on the way in, so the `stalled` it was looking for had already been overwritten and
   * {@link reconnected$} never fired. The state signal is for display and is lossy by design; a
   * "did we drop" fact needs its own home.
   */
  private droppedSinceReading = false;

  /**
   * Fires each time a **dropped** stream comes back — never on the first connection.
   *
   * <p>⭐ **This exists so that the consumer can re-read the authoritative `GET`.** The stream carries
   * no replay, deliberately: every frame is a whole meter rather than a delta, so a queue would be the
   * wrong recovery and a re-read is the right one. While the socket was down, any number of changes
   * happened with nobody listening, and this is how that gap gets closed.
   *
   * <p>⚠ **An Observable and not an `effect` on {@link state}, and the reason is worth keeping.** The
   * first version of the consumer did use an effect, which **ran out of heap**: an effect that reads a
   * signal and performs a side effect that writes signals is a loop Angular cannot break, and the
   * symptom was a 4GB OOM in a unit test rather than anything that named the cause. A reconnection is
   * an **event**, not a state, and modelling it as one removes the question.
   *
   * <p>⚠ It does **not** fire on the first connection, because the page's own initial `load()` is that
   * read. Firing would make every page open cost two identical requests.
   */
  readonly reconnected$ = this.reconnects.asObservable();

  /**
   * The meter, pushed, for as long as the subscription lasts — reconnecting indefinitely.
   *
   * <p>⭐ **Both a failure and a clean close are reconnected**, and it takes **two** operators to say
   * that: `retry` for the error path and `repeat` for the completion path. See the comment on
   * `repeat` below — a commit shipped with only `retry` and a javadoc claiming both.
   *
   * <p>⚠ **It errors in exactly one case: a permanent refusal** (401/403). Every other transport
   * failure becomes a delay and another attempt, so a caller cannot treat a dropped stream as a reason
   * to discard the value it already has — `OnboardingProgressService` depends on that, and its error
   * arm is a deliberate no-op.
   *
   * <p>Unsubscribing aborts the in-flight request through its `AbortController`, which is what makes
   * a component teardown actually close the socket rather than leaking a reader per navigation.
   */
  watch(): Observable<OnboardingProgressDto> {
    return defer(() => this.openOnce()).pipe(
      retry({
        delay: error => {
          // ⛔ A permanent refusal is not retried. This retried a 401 for ever — measured at 25
          // requests in two simulated minutes, ~720/h per open tab — and because this is `fetch`
          // rather than `HttpClient`, `AuthExpiredInterceptor` never sees the status, so nothing
          // signed the clinician out and nothing stopped the asking either.
          if (isPermanentRefusal(error)) {
            this.connectionState.set('refused');
            return throwError(() => error);
          }
          // Set before the timer, so the UI says "reconnecting" during the wait rather than after it.
          this.connectionState.set('stalled');
          this.droppedSinceReading = true;
          return timer(RECONNECT_DELAY_MS);
        },
      }),
      // ⛔ `repeat` BESIDE `retry`, and its absence was a blocking defect — caught in review after
      // this file's own javadoc had claimed for a whole commit that `watch` "turns both into a
      // reconnect". It does not: **RxJS `retry` resubscribes on `error` only, never on completion.**
      //
      // A server that closes the stream CLEANLY — `reader.read()` returning `done`, which is what a
      // `deploy.sh` restart, an `nginx -s reload`, an upstream keepalive recycle and a mobile-network
      // hand-off all produce — completed the Observable, and nothing resubscribed. Measured: one
      // `fetch`, then 60s of timer advance, then still one `fetch`, with `state()` at `idle` — which
      // the template renders as **nothing at all**, because the note only fires on `stalled`.
      //
      // ⚠ **And the meter stayed correct throughout, because the `GET` is authoritative** — which is
      // exactly what made it invisible. That is this estate's silence-that-looks-like-health, in the
      // half of the unit that is the point of the unit.
      //
      // ⭐ The abort path is unaffected: unsubscription tears the pipeline down, so the `complete()`
      // `pump` issues after an abort has nothing left to repeat and a teardown still closes for good.
      repeat({
        delay: () => {
          // Same two side effects as the error path: a clean close is a drop as far as the clinician
          // is concerned, and the GET still has to be re-read because changes happened while the
          // socket was down and this stream carries no replay.
          this.connectionState.set('stalled');
          this.droppedSinceReading = true;
          return timer(RECONNECT_DELAY_MS);
        },
      }),
      // ⚠ `idle` belongs HERE and not in openOnce's teardown, which was where it first went and was
      // wrong in a way worth recording: one attempt ending is not the watch ending. RxJS unsubscribes
      // the failed source *after* the retry notifier runs, so a teardown that set `idle` overwrote the
      // `stalled` just set above and the UI reported a healthy idle stream throughout an outage.
      // `finalize` runs once, when the consumer lets go.
      //
      // ⛔ It must not overwrite `refused`, which is terminal: the refusal errors the pipeline, so
      // `finalize` runs immediately afterwards, and setting `idle` there would turn "the server
      // rejected your credential and nothing is retrying" back into "nothing is happening" — the two
      // states this whole guard exists to distinguish.
      finalize(() => {
        if (this.connectionState() !== 'refused') {
          this.connectionState.set('idle');
        }
        // ⛔ And the drop flag is cleared here too, or it LEAKS INTO THE NEXT WATCH. A stream that
        // dropped set it and only `pump` clears it, on the reconnect that consumes it — so a
        // clinician who navigated away inside the five-second reconnect window left it set, and the
        // next visit fired `reconnected$` on a connection that was the first in its life. Measured:
        // 1 recovery where the contract above promises 0, costing one duplicate `GET` because
        // `refresh()` clears the in-flight guard before `load()`.
        //
        // ⚠ **The mechanism predates this delta — the `retry` arm already set the flag — but adding
        // the `repeat` arm widened the trigger from "an error, then navigate away within 5s" to "or a
        // clean close", which every `deploy.sh` restart and `nginx -s reload` produces. Rare became
        // routine, so it is this delta's to fix.**
        //
        // ⛔ Not cleared in `openOnce`, which looks like the tidier home and is wrong: that runs on
        // every attempt including the reconnect, so it would clear the flag before `pump` could read
        // it and `reconnected$` would never fire at all. The flag's life is the watch's, which is
        // exactly what `finalize` bounds.
        this.droppedSinceReading = false;
      }),
    );
  }

  /**
   * One connection attempt. **Completes** when the server closes the stream and **errors** when it
   * cannot be read; {@link watch} reconnects after either — `repeat` handles the first and `retry`
   * the second, which is why both operators are there.
   */
  private openOnce(): Observable<OnboardingProgressDto> {
    return new Observable<OnboardingProgressDto>(subscriber => {
      const controller = new AbortController();
      this.connectionState.set('connecting');
      void this.pump(controller.signal, subscriber);
      // Abort only: the connection state is owned by watch()'s finalize, because this teardown also
      // runs between retries and must not report an outage as an idle stream.
      return () => controller.abort();
    });
  }

  /**
   * Reads the response body to exhaustion, handing each complete frame to {@link feed}.
   *
   * <p>⚠ **An abort is not a failure.** Unsubscribing rejects the in-flight `read()` with an
   * `AbortError`, and reporting that as an error would make every teardown schedule a reconnect to a
   * stream nobody is watching. The abort signal is checked rather than the error's name, because the
   * name differs between browsers and jsdom.
   */
  private async pump(
    abort: AbortSignal,
    subscriber: { next: (dto: OnboardingProgressDto) => void; error: (e: unknown) => void; complete: () => void },
  ): Promise<void> {
    try {
      const response = await fetch(this.streamUrl(), {
        signal: abort,
        headers: this.authorization(),
        // SSE is a long-lived read; a cached or buffered response would defeat the whole endpoint.
        cache: 'no-store',
      });
      if (!response.ok || !response.body) {
        // ⚠ A lower-case diagnostic rather than a sentence, deliberately: `untranslated-literals.spec.ts`
        // reports sentence-shaped string literals in TypeScript, and rightly — a caption that reached a
        // user untranslated would render in English on three of the four locales. This string reaches no
        // user at all (the `retry` above swallows it), so the fix is to make it read as what it is, a log
        // line, rather than to exempt the file.
        throw new StreamRefusedError(response.status);
      }
      this.connectionState.set('connected');
      // Only a stream that had dropped announces a recovery: the first connection is the page's own
      // load() and must not cost a second identical read.
      if (this.droppedSinceReading) {
        this.droppedSinceReading = false;
        this.reconnects.next();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer = this.feed(buffer + decoder.decode(value, { stream: true }), dto => subscriber.next(dto));
      }
      subscriber.complete();
    } catch (error) {
      if (abort.aborted) {
        subscriber.complete();
        return;
      }
      subscriber.error(error);
    }
  }

  /**
   * Splits an SSE byte stream into frames and emits the progress payloads, returning whatever tail is
   * not yet a complete frame.
   *
   * <p>The framing rules that matter here, from the SSE grammar:
   *
   * <ul>
   *   <li>A frame ends at a **blank line**, so a partial frame must be carried over to the next chunk
   *       — a payload can and does arrive split across reads.</li>
   *   <li>A line beginning `:` is a **comment** and carries nothing. ⭐ That is what the server's
   *       heartbeat is, and discarding it here is what keeps the heartbeat from being mistaken for a
   *       meter.</li>
   *   <li>`data:` may appear more than once in a frame and the values join with a newline.</li>
   * </ul>
   *
   * <p>⚠ **A frame that does not parse is dropped, not thrown.** The stream is an enhancement over an
   * authoritative `GET`, so one unreadable frame must cost that frame and not the connection.
   */
  private feed(buffer: string, emit: (dto: OnboardingProgressDto) => void): string {
    // Normalised first: the grammar allows CRLF, LF and CR line endings, and a frame boundary that
    // arrived as \r\n\r\n would otherwise never match.
    const normalised = buffer.replace(/\r\n|\r/g, '\n');
    const frames = normalised.split('\n\n');
    // The last element is the incomplete tail — "a\n\nb" leaves "b", and "a\n\n" leaves "".
    const tail = frames.pop() ?? '';

    for (const frame of frames) {
      let name = 'message';
      const data: string[] = [];
      for (const line of frame.split('\n')) {
        if (line === '' || line.startsWith(':')) {
          continue;
        }
        const colon = line.indexOf(':');
        const field = colon === -1 ? line : line.slice(0, colon);
        // One optional space after the colon is part of the framing, not of the value.
        const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
        if (field === 'event') {
          name = value;
        } else if (field === 'data') {
          data.push(value);
        }
      }
      if (name !== EVENT_NAME || data.length === 0) {
        continue;
      }
      try {
        emit(JSON.parse(data.join('\n')) as OnboardingProgressDto);
      } catch {
        // Unreadable payload: drop the frame and keep the stream. The next one is a whole meter.
      }
    }
    return tail;
  }

  /**
   * ⛔ **The token goes in a header and never in this URL** — see the class comment for why a query
   * parameter is refused rather than merely dispreferred.
   */
  private streamUrl(): string {
    return this.applicationConfigService.getEndpointFor('api/onboarding/progress/stream', 'professionalservice');
  }

  /**
   * The same credential `AuthInterceptor` adds, read from the same place.
   *
   * <p>⚠ Through `StateStorageService` rather than from `localStorage` directly: the token lives in
   * `localStorage` **or** `sessionStorage` depending on whether the clinician ticked "remember me",
   * and that service is the one thing that knows both. Reading one of the two here would log out
   * exactly half of the user base from the live meter and nothing else.
   *
   * <p>`fetch` is used rather than `HttpClient`, so `AuthInterceptor` does not run and the header is
   * set here. ⚠ **Read per attempt, not once**, so a token refreshed between attempts is picked up
   * and a stale one cannot 401 for ever.
   *
   * <p>An absent token sends no header at all, and the server answers **401** — which
   * {@link isPermanentRefusal} makes **terminal**. ⚠ This javadoc used to say that was "the right
   * behaviour: a signed-out tab has no meter to update". Right that it must not update; wrong that it
   * should keep asking, which it did, for ever.
   */
  private authorization(): Record<string, string> {
    const token = this.stateStorageService.getAuthenticationToken();
    return token ? { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' } : { Accept: 'text/event-stream' };
  }
}
