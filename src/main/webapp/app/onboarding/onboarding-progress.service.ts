import { Injectable, computed, inject, signal } from '@angular/core';

import { OnboardingApiService, OnboardingProgressDto } from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressStreamService } from './onboarding-progress-stream.service';

/**
 * One copy of "how far has this clinician got", shared by everything that asks.
 *
 * <p>Three surfaces read it — the meter at the top of {@code /account/profile}, the post-sign-in
 * redirect on the dashboard, and the profile tabs' per-requirement ticks — and they must agree.
 * Holding it here rather than fetching per component also means the dashboard's redirect check and
 * the profile page's meter cost one request between them, not two.
 *
 * <p>The figure itself comes from {@code api/} and is never recomputed here. See
 * {@code professional-onboarding-workflow.md} § "Onboarding state events and the completion
 * contract" for why the browser is not trusted to decide what complete means.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingProgressService {
  private readonly api = inject(OnboardingApiService);
  private readonly streamService = inject(OnboardingProgressStreamService);

  private readonly state = signal<OnboardingProgressDto | null>(null);
  private readonly loading = signal(false);

  readonly progress = this.state.asReadonly();

  /** Null while unknown — callers must not treat "not loaded yet" as "incomplete". */
  readonly complete = computed<boolean | null>(() => this.state()?.complete ?? null);
  readonly percent = computed(() => this.state()?.percent ?? 0);

  /**
   * Fetches unless a request is already in flight.
   *
   * <p>Guarded because the dashboard and the profile page both ask on init, and a clinician landing
   * on the dashboard and being redirected to the profile would otherwise issue two.
   */
  load(): void {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.api.progress().subscribe({
      next: progress => {
        this.state.set(progress);
        this.loading.set(false);
      },
      // Left null rather than assumed incomplete: a failed request must not bounce someone to a
      // page telling them to finish a profile that may well be finished.
      error: () => this.loading.set(false),
    });
  }

  /** After a save that may have satisfied a requirement, so the meter moves without a reload. */
  refresh(): void {
    this.loading.set(false);
    this.load();
  }

  /**
   * Starts the live push, and keeps it running until the returned teardown is called (`backlog.md`
   * row 230, unit B).
   *
   * <h2>⭐ The `GET` stays authoritative; this only pushes changes</h2>
   *
   * <p>Row 230 settled this and it is the property that makes the whole design survive a broker
   * outage: `application.kafka.enabled=false` is a **supported configuration**, so a meter whose only
   * input was events would sit at zero while the service reported healthy. {@link load} computes from
   * the database and is the source of the number; a frame arriving here is an optimisation on
   * re-reading it.
   *
   * <p>⛔ **So a stream failure must never blank the meter.** It sets no state, clears nothing, and
   * leaves {@link progress} exactly as it was — `onboarding-progress.service.spec.ts` asserts that a
   * mid-stream error leaves an already-correct meter standing.
   *
   * <p>⚠ **The `error` arm below is live, and this paragraph said it could not be reached.** It read
   * that the stream Observable "never errors (it reconnects instead)" and that the arm was there "for
   * the case where it is made possible later". That was true when it was written and stopped being
   * true in the same cycle: `OnboardingProgressStreamService` now treats a **401 or 403 as terminal**
   * and errors rather than retrying for ever. So the no-op is a deliberate, reachable no-op — the
   * behaviour is unchanged and correct, and only the explanation was stale.
   *
   * <p>⚠ **A reconnect re-reads the `GET`, and that is not redundant.** While the socket was down, any
   * number of changes happened with nobody listening, and the stream carries no replay — deliberately,
   * since every frame is a whole meter rather than a delta. So the authoritative read is how the gap is
   * closed, and it is the better recovery: it cannot be stale, where a replayed queue can.
   */
  watch(): () => void {
    const frames = this.streamService.watch().subscribe({
      next: progress => this.state.set(progress),
      // ⚠ REACHABLE, and a deliberate no-op: the transport errors on a permanent refusal (401/403)
      // rather than retrying it for ever. Swallowing it is the point — losing the push must not lose
      // the number, and the meter on screen came from the authoritative GET. This comment said
      // "cannot be reached", which the terminal-refusal change falsified without touching this file.
      error: () => undefined,
    });

    // ⚠ An event, not an effect on the transport's state signal. The first version of this read
    // `streamService.state()` inside an `effect` and called refresh() from it — which is an effect
    // that writes the signals it is reacting to, and it exhausted the heap rather than failing in a
    // way that named itself. A reconnection is an occurrence; subscribing to one is the honest shape.
    const reconnections = this.streamService.reconnected$.subscribe(() => this.refresh());

    return () => {
      frames.unsubscribe();
      reconnections.unsubscribe();
    };
  }

  /** Whether the live push is working — **not** whether the meter is right. See {@link watch}. */
  readonly streamState = computed(() => this.streamService.state());

  /**
   * Sign-out has to drop this, or the next account inherits the last one's percentage.
   *
   * <p>Called by {@code LoginService.logout()}, which is the single sign-out funnel — the sidebar
   * button and the 401 path in {@code AuthExpiredInterceptor} both route through it. It had no
   * caller at all until then, so this comment stated a requirement nothing met; `login.service.spec.ts`
   * now holds the wiring.
   */
  clear(): void {
    this.state.set(null);
    this.loading.set(false);
  }
}
