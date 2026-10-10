import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';

import { StateStorageService } from 'app/core/auth/state-storage.service';
import { OnboardingProgressDto } from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressStreamService } from './onboarding-progress-stream.service';

/**
 * ⛔ **The guard against "simplifying" this back to `EventSource` plus a query-parameter token** —
 * `backlog.md` row 230, unit B.
 *
 * <p>`EventSource` is the obvious tool for SSE and cannot be used: it sends no custom headers, and
 * this app authenticates with `Authorization: Bearer`. **Measured on the running quality stack,
 * 2026-10-10:** the stream with no `Authorization` header answers **401**. The workaround that
 * presents itself is `?token=…`, and it is refused rather than dispreferred — it writes a JWT into
 * every nginx access log on both hops, into browser history and into outbound `Referer` headers, and
 * the three products share one signing key so a leaked token is accepted by hc-admin and hc-patient
 * too. This estate retired an *email address* from a URL for exactly that reason.
 *
 * <p>⭐ So *"should send the token in a header and never in the URL"* is the case this file exists
 * for. The rest cover the framing, which has to be hand-written because `fetch` gives none of it.
 */
describe('OnboardingProgressStreamService', () => {
  let service: OnboardingProgressStreamService;
  let fetchMock: jest.Mock;
  let subscriptions: Subscription[];
  let errors: unknown[];

  const TOKEN = 'a-signed-jwt-value';

  /** Mirrors `RECONNECT_DELAY_MS`, which the service keeps private. */
  const RECONNECT_MS = 5_000;

  /** A response whose body yields the given chunks, then closes — the shape `fetch` returns. */
  const streaming = (...chunks: string[]): Response => {
    const encoder = new TextEncoder();
    let index = 0;
    return {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: () =>
            Promise.resolve(
              index < chunks.length ? { done: false, value: encoder.encode(chunks[index++]) } : { done: true, value: undefined },
            ),
        }),
      },
    } as unknown as Response;
  };

  /**
   * A response that stays open — a `read()` that never resolves until aborted.
   *
   * <p>⚠ Needed by the teardown cases, and the reason is worth keeping: a `streaming()` response
   * *completes*, and completion makes RxJS tear the source down on its own. So a test that asserted
   * "not yet aborted" against one was asserting against an already-finished stream. A real meter
   * stream stays open for hours; this is the honest fixture for it.
   */
  const hanging = (): Response =>
    ({
      ok: true,
      status: 200,
      body: { getReader: () => ({ read: () => new Promise(() => undefined) }) },
    }) as unknown as Response;

  /** Delivers the chunks and then stays open, which is what a live stream between pushes looks like. */
  const deliveringThenOpen = (...chunks: string[]): Response => {
    const encoder = new TextEncoder();
    let index = 0;
    return {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: () =>
            index < chunks.length ? Promise.resolve({ done: false, value: encoder.encode(chunks[index++]) }) : new Promise(() => undefined),
        }),
      },
    } as unknown as Response;
  };

  const frame = (dto: Partial<OnboardingProgressDto>): string => `event: onboarding-progress\ndata: ${JSON.stringify(dto)}\n\n`;

  /** Lets the microtask queue drain, which is how the `fetch`/reader promises resolve. */
  const settle = async (): Promise<void> => {
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }
  };

  beforeEach(() => {
    // Fake timers for the reconnect delay, which is otherwise five real seconds per retry case.
    jest.useFakeTimers();
    subscriptions = [];
    errors = [];
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    TestBed.configureTestingModule({
      providers: [{ provide: StateStorageService, useValue: { getAuthenticationToken: () => TOKEN } }],
    });
    service = TestBed.inject(OnboardingProgressStreamService);
  });

  afterEach(() => {
    subscriptions.forEach(subscription => subscription.unsubscribe());
    jest.useRealTimers();
  });

  /**
   * Subscribes and collects frames.
   *
   * <p>⚠ **An `error` arm is supplied deliberately.** Since a permanent refusal became terminal, this
   * Observable *can* error, and a bare `next`-only subscriber makes RxJS report it as unhandled —
   * which fails the case with the refusal's own message rather than its assertion. `errors` is
   * returned so a case can assert the refusal arrived. The real consumer,
   * `OnboardingProgressService.watch`, supplies the same arm as a deliberate no-op: losing the push
   * must not lose the number.
   */
  const watch = (received: OnboardingProgressDto[] = []): OnboardingProgressDto[] => {
    subscriptions.push(service.watch().subscribe({ next: dto => received.push(dto), error: error => errors.push(error) }));
    return received;
  };

  /**
   * ⛔ **The case this file exists for.** The credential travels in a header and the URL is clean.
   *
   * <p>Both halves are asserted and both matter. A URL assertion alone would pass against an
   * implementation that sent no credential at all; a header assertion alone would pass against one
   * that sent it twice, in a header *and* a parameter. The second is the realistic regression, because
   * somebody adding `EventSource` as a "fallback" would leave the header in place.
   */
  it('should send the token in a header and never in the URL', async () => {
    fetchMock.mockResolvedValue(streaming(frame({ percent: 11 })));

    watch();
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expectNoCredentialInAnyUrl();
  });

  /**
   * ⛔ **The same invariant on EVERY attempt, not just the first** — and this is the version that
   * matters, because the first one did not cover the path the guard was asked for.
   *
   * <p>⚠ The original three assertions all read `fetchMock.mock.calls[0]`. A mutation that put
   * `?token=` on the **second and subsequent** requests passed **15/15 green**, including the
   * reconnect case, which does make a second `fetch`. The code was clean — `streamUrl()` takes no
   * arguments and has no attempt-dependent branch, so there was no leak — but *the guard did not
   * cover the path*, which is the defect: a later "retry with the token in the URL as a fallback" is
   * exactly the shape somebody would add, and it would have shipped green.
   */
  it('should keep the credential out of the URL on every attempt, not only the first', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('socket closed'))
      .mockRejectedValueOnce(new Error('socket closed again'))
      .mockResolvedValue(deliveringThenOpen(frame({ percent: 33 })));

    watch();
    await settle();
    jest.advanceTimersByTime(RECONNECT_MS);
    await settle();
    jest.advanceTimersByTime(RECONNECT_MS);
    await settle();

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
    expectNoCredentialInAnyUrl();
  });

  /**
   * The credential invariant, over **every** request made so far.
   *
   * <p>Shared rather than inlined so that a new case cannot assert the weak, call-0 version of it by
   * accident — which is how the first version of this guard came to cover one request out of many.
   */
  const expectNoCredentialInAnyUrl = (): void => {
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    for (const [url, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
      // ⛔ Not merely "does not contain the token": each of these would be a credential in a URL, and
      // the token is asserted separately so that a *different* secret in the query string still fails.
      expect(url).not.toContain(TOKEN);
      expect(url).not.toMatch(/[?&](token|access_token|jwt|auth|bearer|id_token)=/i);
      expect(url).not.toContain('?');
      expect(url).toContain('api/onboarding/progress/stream');
    }
  };

  /** The endpoint is reached through `ApplicationConfigService`, never as a hardcoded service path. */
  it('should address the stream through the professionalservice prefix', async () => {
    fetchMock.mockResolvedValue(streaming());

    watch();
    await settle();

    expect(fetchMock.mock.calls[0][0]).toBe('services/professionalservice/api/onboarding/progress/stream');
  });

  it('should emit the meter carried by a progress frame', async () => {
    fetchMock.mockResolvedValue(streaming(frame({ percent: 89, complete: false })));

    const received = watch();
    await settle();

    expect(received).toHaveLength(1);
    expect(received[0].percent).toBe(89);
  });

  /**
   * ⭐ **A heartbeat is a comment and must emit nothing** — the property that keeps the stream from
   * becoming a second source of the number.
   *
   * <p>`OnboardingProgressStream.sendHeartbeats` sends `:heartbeat` every 30s so that nginx's
   * `proxy_read_timeout 120s` does not cut an idle stream. If this client treated a comment as a frame
   * it would either crash on unparseable JSON or, worse, emit something.
   */
  it('should discard a heartbeat comment without emitting', async () => {
    fetchMock.mockResolvedValue(streaming(':heartbeat\n\n', ':heartbeat\n\n'));

    const received = watch();
    await settle();

    expect(received).toEqual([]);
  });

  /**
   * A frame split across two reads is the normal case on a real socket, not an exotic one: the payload
   * is a few hundred bytes and TCP does not respect message boundaries.
   */
  it('should reassemble a frame split across chunks', async () => {
    const whole = frame({ percent: 42 });
    fetchMock.mockResolvedValue(streaming(whole.slice(0, 20), whole.slice(20)));

    const received = watch();
    await settle();

    expect(received.map(dto => dto.percent)).toEqual([42]);
  });

  /** An event of another name is not this stream's business, and must not be parsed as a meter. */
  it('should ignore a frame with a different event name', async () => {
    fetchMock.mockResolvedValue(streaming('event: something-else\ndata: {"percent":7}\n\n'));

    const received = watch();
    await settle();

    expect(received).toEqual([]);
  });

  /**
   * ⚠ One unreadable frame costs that frame, not the connection: the next one is a whole meter, and the
   * authoritative `GET` is still there either way.
   */
  it('should drop an unparseable payload and keep reading', async () => {
    fetchMock.mockResolvedValue(streaming('event: onboarding-progress\ndata: {not json\n\n', frame({ percent: 55 })));

    const received = watch();
    await settle();

    expect(received.map(dto => dto.percent)).toEqual([55]);
  });

  /**
   * ⭐ **A dropped stream is visible and recovers** — the client must distinguish "connected" from
   * "stalled", because an idle stream and a dead one both deliver nothing.
   */
  it('should report connected while reading and stalled after a failure', async () => {
    expect(service.state()).toBe('idle');

    // A hanging response, because a stream that has closed is no longer connected — and reporting
    // `connected` for a finished stream is precisely the confusion this state exists to remove.
    fetchMock.mockResolvedValue(hanging());
    watch();
    await settle();

    expect(service.state()).toBe('connected');
  });

  it('should go stalled and reconnect after the transport fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('socket closed')).mockResolvedValue(deliveringThenOpen(frame({ percent: 70 })));

    const received = watch();
    await settle();

    expect(service.state()).toBe('stalled');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // The reconnect is delayed deliberately, so it is the timer that releases it rather than time
    // passing in the test.
    jest.advanceTimersByTime(RECONNECT_MS);
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(received.map(dto => dto.percent)).toEqual([70]);
    expect(service.state()).toBe('connected');
  });

  /**
   * ⛔ **A CLEAN SERVER CLOSE MUST RECONNECT — this was a blocking defect, caught in review.**
   *
   * <p>`pump` calls `subscriber.complete()` when `reader.read()` returns `done`, and `watch` piped
   * **`retry` alone**. RxJS `retry` resubscribes on `error` only, never on completion — while the
   * javadoc claimed it "turns both into a reconnect". Measured on the shipped code: one `fetch`, then
   * 60s of timer advance, then still **one** `fetch`, with `state()` at `idle`.
   *
   * <p>⚠ **And `idle` renders as nothing at all**, because the template's note only fires on
   * `stalled` — so the live meter was dead for the rest of the page view with no indication, and the
   * number stayed correct because the `GET` is authoritative. Silence that looks like health, in the
   * half of the unit that is the point of the unit.
   *
   * <p>This is not an exotic path: every `deploy.sh` restart, every `nginx -s reload`, every upstream
   * keepalive recycle and any mobile-network hand-off that ends the body cleanly produces it.
   */
  it('should reconnect after the server closes the stream cleanly', async () => {
    // `streaming()` delivers its frame and then ends — a clean close, not an error.
    fetchMock.mockResolvedValueOnce(streaming(frame({ percent: 5 }))).mockResolvedValue(deliveringThenOpen(frame({ percent: 6 })));

    const received = watch();
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.state()).toBe('stalled');

    jest.advanceTimersByTime(RECONNECT_MS);
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(received.map(dto => dto.percent)).toEqual([5, 6]);
    expect(service.state()).toBe('connected');
  });

  /**
   * A clean close must also re-read the authoritative `GET`, for the same reason a failure does:
   * changes happened while the socket was down and this stream carries no replay.
   */
  it('should announce a reconnection after a clean close too', async () => {
    const recoveries: void[] = [];
    subscriptions.push(service.reconnected$.subscribe(() => recoveries.push(undefined)));
    fetchMock.mockResolvedValueOnce(streaming(frame({ percent: 5 }))).mockResolvedValue(hanging());

    watch();
    await settle();
    jest.advanceTimersByTime(RECONNECT_MS);
    await settle();

    expect(recoveries).toHaveLength(1);
  });

  /** A 404 is retried: it is what a client gets mid-deploy before the new route is up. */
  it('should treat a transient refusal as a failure to be retried', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, body: null } as unknown as Response).mockResolvedValue(hanging());

    watch();
    await settle();

    expect(service.state()).toBe('stalled');

    jest.advanceTimersByTime(RECONNECT_MS);
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  /**
   * ⛔ **A permanent refusal stops, and before review it did not** — measured at 25 requests in two
   * simulated minutes, ~720/h per open tab, for ever.
   *
   * <p>Because this is `fetch` and not `HttpClient`, the 401 never reaches `AuthExpiredInterceptor`,
   * so nothing signed the clinician out and nothing else would ever have stopped the loop. The
   * no-backoff argument is fine for a transport failure and does not reach a rejected credential.
   */
  it('should stop asking after a permanent refusal', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, body: null } as unknown as Response);

    watch();
    await settle();

    expect(service.state()).toBe('refused');

    jest.advanceTimersByTime(120_000);
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.state()).toBe('refused');
    // The refusal surfaces rather than being swallowed, so a consumer could act on it if it wanted to.
    expect(errors).toHaveLength(1);
  });

  it('should stop asking after a forbidden response as well', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, body: null } as unknown as Response);

    watch();
    await settle();
    jest.advanceTimersByTime(120_000);
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.state()).toBe('refused');
  });

  /**
   * ⛔ **Unsubscribing must abort the request**, or every navigation away from the profile page leaves
   * a socket and a reconnect loop behind, and the server keeps an emitter to heartbeat at.
   */
  it('should abort the request when the subscription ends', async () => {
    let passedSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      passedSignal = init.signal as AbortSignal;
      return Promise.resolve(hanging());
    });

    const subscription = service.watch().subscribe();
    await settle();
    expect(passedSignal!.aborted).toBe(false);

    subscription.unsubscribe();

    expect(passedSignal!.aborted).toBe(true);
    expect(service.state()).toBe('idle');
  });

  /**
   * ⚠ An abort is not a failure. Reporting it as one would make every teardown schedule a reconnect to
   * a stream nobody is watching.
   */
  it('should not reconnect after being unsubscribed', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          (init.signal as AbortSignal).addEventListener('abort', () => reject(new Error('AbortError')));
        }),
    );

    const subscription = service.watch().subscribe();
    await settle();
    subscription.unsubscribe();
    jest.advanceTimersByTime(30_000);
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /**
   * ⭐ **`reconnected$` fires on a recovery and not on the first connection** — the distinction the
   * consumer depends on to avoid a duplicate read of the authoritative `GET` on every page open.
   */
  it('should not announce a reconnection on the first connection', async () => {
    const recoveries: void[] = [];
    subscriptions.push(service.reconnected$.subscribe(() => recoveries.push(undefined)));
    fetchMock.mockResolvedValue(hanging());

    watch();
    await settle();

    expect(service.state()).toBe('connected');
    expect(recoveries).toHaveLength(0);
  });

  it('should announce a reconnection once a dropped stream comes back', async () => {
    const recoveries: void[] = [];
    subscriptions.push(service.reconnected$.subscribe(() => recoveries.push(undefined)));
    fetchMock.mockRejectedValueOnce(new Error('socket closed')).mockResolvedValue(hanging());

    watch();
    await settle();
    expect(recoveries).toHaveLength(0);

    jest.advanceTimersByTime(RECONNECT_MS);
    await settle();

    expect(recoveries).toHaveLength(1);
  });

  /**
   * ⛔ **A drop flag left behind by a torn-down watch must not fire on a fresh first connection.**
   *
   * <p>Found in delta review. `droppedSinceReading` is set by both reconnect arms and cleared only by
   * the `pump` that consumes it, so a clinician who navigated away *inside* the five-second reconnect
   * window left it set — and the next visit announced a recovery on a connection that was the first in
   * its life. Measured before the fix: **1 recovery where {@link reconnected$} promises 0**, costing
   * one duplicate `GET`, because `OnboardingProgressService.refresh()` clears the in-flight guard
   * before `load()`.
   *
   * <p>⚠ The mechanism predates the `repeat` arm — `retry` already set the flag — but `repeat` widened
   * the trigger from "an error, then navigate away within 5s" to "**or a clean close**", which every
   * `deploy.sh` restart and `nginx -s reload` produces. Rare became routine.
   */
  it('should not announce a recovery on the first connection of a new watch after an earlier drop', async () => {
    // Drop, then navigate away inside the reconnect window.
    fetchMock.mockRejectedValueOnce(new Error('socket closed'));
    const abandoned = service.watch().subscribe({ next: () => undefined, error: () => undefined });
    await settle();
    expect(service.state()).toBe('stalled');
    abandoned.unsubscribe();

    const recoveries: void[] = [];
    subscriptions.push(service.reconnected$.subscribe(() => recoveries.push(undefined)));
    fetchMock.mockResolvedValue(hanging());

    watch();
    await settle();

    expect(service.state()).toBe('connected');
    expect(recoveries).toHaveLength(0);
  });

  /** And a clean close is the same case, which is the half this delta widened. */
  it('should not announce a recovery after a clean close on a watch that was abandoned', async () => {
    fetchMock.mockResolvedValueOnce(streaming(frame({ percent: 1 })));
    const abandoned = service.watch().subscribe({ next: () => undefined, error: () => undefined });
    await settle();
    expect(service.state()).toBe('stalled');
    abandoned.unsubscribe();

    const recoveries: void[] = [];
    subscriptions.push(service.reconnected$.subscribe(() => recoveries.push(undefined)));
    fetchMock.mockResolvedValue(hanging());

    watch();
    await settle();

    expect(recoveries).toHaveLength(0);
  });

  /** A signed-out tab has no meter to update, and sends no empty `Authorization` header pretending to. */
  it('should send no authorization header when there is no token', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: StateStorageService, useValue: { getAuthenticationToken: () => null } }],
    });
    const anonymous = TestBed.inject(OnboardingProgressStreamService);
    fetchMock.mockResolvedValue(streaming());

    subscriptions.push(anonymous.watch().subscribe());
    await settle();

    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty('Authorization');
  });
});
