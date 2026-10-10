import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import SharedModule from 'app/shared/shared.module';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { OnboardingSteps } from 'app/health-connect/api/onboarding-api.service';
import { ProfileTab } from './profile-page.component';

/**
 * The 0–100% completion meter at the top of the profile page.
 *
 * <p>Renders the server's figure, `profile.md`'s **four coarse steps**, and the per-requirement
 * breakdown; it computes nothing. Showing <em>which</em> requirements are outstanding rather than only
 * the percentage is the difference between "62%" and "62% — licence and photo still needed", and it is
 * the same list the service uses to refuse activation, so the two can never disagree about what is
 * missing.
 *
 * <h2>⭐ Two readings of one state, both on screen (`backlog.md` row 230, unit B)</h2>
 *
 * <p>Row 230 decided that the wire carries the four steps **coarsely** — one boolean each — with the
 * form validating every requirement client-side so the applicant still sees which gaps remain. Both
 * halves are rendered here because they answer different questions: the four steps say *where am I in
 * this process*, and map one-to-one onto the page's own tabs; the nine requirements say *what exactly
 * is missing*. The coarse row alone would have regressed what this component could say, which is the
 * objection row 230 answers with the client-side validation in `clinical-profile.component`.
 *
 * <p>⚠ **The step booleans are derived server-side from the same requirement answers** —
 * `OnboardingService.stepsFrom` — so the two rows on this screen cannot contradict each other about a
 * predicate. Three of the four are conjunctions over requirement keys; the fourth is step 1.
 *
 * <h2>⚠ Step 1 reads `false` for every seeded clinician, and that is correct</h2>
 *
 * <p>`account` is the one step `api/` cannot compute — its four fields live on `User` in the gateway —
 * so it comes from a stored projection fed by Kafka frames, where `false` also means "no frame has
 * arrived yet". Three independent reasons make it `false` on quality today (`backlog.md` rows 232, 233
 * and 234). ⛔ **Nothing here tries to correct it**: nothing gates on it, and its failure direction is
 * the safe one — it can read `false` when complete but never `true` when not.
 *
 * <h2>The live push, and why losing it does not blank anything</h2>
 *
 * <p>{@link OnboardingProgressService#watch} pushes updates over SSE and the `GET` stays authoritative.
 * The stream's state is surfaced as a quiet label rather than an error, because a dropped stream costs
 * the live refresh and **not** the meter — the number on screen remains the last authoritative read.
 *
 * <p>⚠ **`refused` deliberately renders nothing, and that is a stated choice rather than an
 * oversight.** The note fires on `stalled` only. `refused` is the terminal state a 401 or 403 puts the
 * stream into, and it needs no label because it **self-heals through a path the user already sees**:
 * the stream and the authoritative `GET` carry the same credential, and `web/` has **no refresh-token
 * flow at all**, so a token the stream is refused for is a dead token — the next `GET` is refused too,
 * and that one goes through `HttpClient`, where `AuthExpiredInterceptor` ends the session.
 *
 * <p>⚠ **The mechanism is the clinician's next navigation or save, NOT a poll.** This said "a state
 * lasting until the next poll" and there is no poll: nothing in `app/onboarding` or
 * `app/account/profile` is periodic — the only `timer` calls in the stream service are its reconnect
 * delays. So the window is bounded by the next request the clinician causes, which on this page is a
 * tab change or Save, and is not bounded by anything on a page they leave open and do not touch. The
 * decision stands; only the named mechanism was wrong.
 *
 * <p>⛔ **That argument is specific to `refused` and must not be generalised to a silent stream** — it
 * is the shape of reasoning that let a clean server close go unreported for a whole commit (see the
 * `repeat` comment in `OnboardingProgressStreamService.watch`). The distinction is self-healing versus
 * not: a cleanly-closed stream recovered through nothing, whereas this recovers through sign-out. If
 * that stops being true — a separately-scoped stream credential, say — this wants a label in four
 * locales.
 */

/**
 * The four steps, in `profile.md`'s order, with the tab each one is completed on.
 *
 * <p>⭐ **This is the one place the wire names and the tab ids are mapped**, and they genuinely differ:
 * step 4 is `consent` on the wire and `application` in the UI. A reader looking for why a tick links to
 * a differently-named tab should find the answer here and nowhere else.
 *
 * <p>Keyed by the wire name so that `steps` can be walked by `Object.keys` without a second list to
 * keep in step, and typed `keyof OnboardingSteps` so that a step added to the contract fails to
 * compile here until it is given a tab and a label.
 */
const STEPS: { key: keyof OnboardingSteps; tab: ProfileTab; labelKey: string }[] = [
  { key: 'account', tab: 'account', labelKey: 'healthConnect.profile.completion.steps.account' },
  { key: 'profile', tab: 'clinical', labelKey: 'healthConnect.profile.completion.steps.profile' },
  { key: 'documents', tab: 'documents', labelKey: 'healthConnect.profile.completion.steps.documents' },
  { key: 'consent', tab: 'application', labelKey: 'healthConnect.profile.completion.steps.consent' },
];

@Component({
  standalone: true,
  selector: 'hpd-completion-meter',
  imports: [SharedModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (progressService.progress(); as progress) {
      <section
        class="rounded-hpd-lg border border-hpd-border bg-white p-6 shadow-hpd-sm"
        [attr.aria-label]="'healthConnect.profile.completion.title' | translate"
      >
        <div class="flex items-baseline justify-between gap-4">
          <h2 class="text-sm font-extrabold uppercase tracking-wide text-hpd-muted" jhiTranslate="healthConnect.profile.completion.title">
            Profile completion
          </h2>
          <p class="text-2xl font-extrabold tabular-nums text-hpd-primary-dark" data-cy="completionPercent">{{ progress.percent }}%</p>
        </div>

        <div
          class="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-hpd-primary/10"
          role="progressbar"
          [attr.aria-valuenow]="progress.percent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="h-full rounded-full transition-[width] duration-500"
            [class]="progress.complete ? 'bg-hpd-success' : 'bg-hpd-gold-bright'"
            [style.width.%]="progress.percent"
          ></div>
        </div>

        <!-- profile.md's four coarse steps — row 230. One per tab, each independently addressable. -->
        <ol class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-cy="completionSteps">
          @for (step of steps(); track step.key) {
            <li
              class="flex items-center gap-3 rounded-hpd-sm border p-3"
              [class]="step.done ? 'border-hpd-success/30 bg-hpd-success-tint' : 'border-hpd-border bg-hpd-surface'"
              [attr.data-cy]="'step-' + step.key"
              [attr.data-done]="step.done"
            >
              <span
                class="grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-extrabold"
                [class]="step.done ? 'bg-hpd-success text-white' : 'bg-hpd-border/60 text-hpd-muted'"
                aria-hidden="true"
                >{{ step.done ? '✓' : step.ordinal }}</span
              >
              <span
                class="text-sm font-semibold"
                [class]="step.done ? 'text-hpd-muted' : 'text-hpd-primary-dark'"
                [jhiTranslate]="step.labelKey"
              ></span>
            </li>
          }
        </ol>

        <p class="mt-4 text-sm text-hpd-muted">
          @if (progress.complete) {
            <span jhiTranslate="healthConnect.profile.completion.complete">
              Everything is in. An administrator reviews your credentials next.
            </span>
          } @else {
            <span jhiTranslate="healthConnect.profile.completion.incomplete">
              Your profile becomes active once these are complete and an administrator has vetted them.
            </span>
          }
        </p>

        <ul class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          @for (requirement of progress.requirements; track requirement.key) {
            <li class="flex items-center gap-2 text-sm" [attr.data-cy]="'requirement-' + requirement.key">
              <span
                class="grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-extrabold"
                [class]="requirement.done ? 'bg-hpd-success-tint text-hpd-success' : 'bg-hpd-border/50 text-hpd-muted'"
                aria-hidden="true"
                >{{ requirement.done ? '✓' : '·' }}</span
              >
              <span
                [class]="requirement.done ? 'text-hpd-muted line-through' : 'font-semibold text-hpd-primary-dark'"
                [jhiTranslate]="'healthConnect.profile.completion.requirements.' + requirement.key"
              ></span>
            </li>
          }
        </ul>

        <!--
          The push is an enhancement over an authoritative GET, so a dropped stream is reported as a
          quiet note and never as an error over a meter that is still correct.
        -->
        @if (progressService.streamState() === 'stalled') {
          <p class="mt-3 text-xs text-hpd-muted" data-cy="streamStalled" jhiTranslate="healthConnect.profile.completion.liveReconnecting">
            Live updates interrupted — reconnecting.
          </p>
        }
      </section>
    }
  `,
})
export default class CompletionMeterComponent {
  readonly progressService = inject(OnboardingProgressService);

  /**
   * The four steps as the template needs them, read from the server's `steps` object.
   *
   * <p>⚠ **Each step is resolved independently** — `STEPS` is walked and each key read on its own — so
   * a wiring mistake affects one tick rather than all four. `completion-meter.component.spec.ts` flips
   * one step at a time for exactly this reason: an aggregate "renders the steps" assertion cannot tell
   * which of the four is actually connected to which boolean, and three of them being hardcoded would
   * satisfy it.
   */
  readonly steps = computed(() => {
    const progress = this.progressService.progress();
    return STEPS.map((step, index) => ({
      key: step.key,
      tab: step.tab,
      labelKey: step.labelKey,
      ordinal: index + 1,
      done: progress?.steps?.[step.key] ?? false,
    }));
  });
}
