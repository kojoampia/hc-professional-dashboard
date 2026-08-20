import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import SharedModule from 'app/shared/shared.module';
import { OnboardingProgressService } from 'app/core/onboarding/onboarding-progress.service';

/**
 * The 0–100% completion meter at the top of the profile page.
 *
 * <p>Renders the server's figure and its per-requirement breakdown; it computes nothing. Showing
 * <em>which</em> requirements are outstanding rather than only the percentage is the difference
 * between "62%" and "62% — licence and photo still needed", and it is the same list the service
 * uses to refuse activation, so the two can never disagree about what is missing.
 */
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

        <p class="mt-3 text-sm text-hpd-muted">
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
      </section>
    }
  `,
})
export default class CompletionMeterComponent {
  readonly progressService = inject(OnboardingProgressService);
}
