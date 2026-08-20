import { Injectable, computed, inject, signal } from '@angular/core';

import { OnboardingApiService, OnboardingProgressDto } from 'app/health-connect/api/onboarding-api.service';

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

  /** Sign-out has to drop this, or the next account inherits the last one's percentage. */
  clear(): void {
    this.state.set(null);
    this.loading.set(false);
  }
}
