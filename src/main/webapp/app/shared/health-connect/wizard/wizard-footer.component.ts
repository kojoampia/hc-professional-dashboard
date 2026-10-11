import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { WIZARD_PANES, WizardPane, WizardService, wizardPanePath } from 'app/onboarding/wizard.service';

/**
 * The onboarding wizard's **save / next / back** row, rendered at the foot of all four panes.
 *
 * <p>`profile.md:275-277` is the whole specification of this component: *"Each pane carries save,
 * next and back buttons as needed: the first pane has no back button, and the last has no next button
 * but a submit button."* Both of those are derived from the pane's position in {@link WIZARD_PANES}
 * rather than configured, so a pane cannot be given the wrong chrome.
 *
 * <h2>⚠ Why it lives in `shared/health-connect/` and not in `app/onboarding/`</h2>
 *
 * <p>`profile-addendum.md` § 5 **Q17** settles that `app/onboarding/` holds *"the wizard service
 * only"* beside the meter services already there. This is presentational chrome shared by four panes
 * that each live in their own entity folder, which is what `shared/health-connect/` is for — beside
 * `dialog/`, `form-controls/`, `async-state/` and `data-table/`. Four copies of this markup was the
 * alternative.
 *
 * <h2>Navigation lives here; sequencing does not</h2>
 *
 * <p>⛔ This component navigates and {@link WizardService} does not — the division
 * `profile-addendum.md` § 3 T8 requires, so the service does not become a second source of truth
 * about where the reader is. What it **asks** the service is only *may this pane open*, and a
 * refused Next is disabled rather than hidden: a hidden button reads as "there is nothing further",
 * where a disabled one with a reason reads as "not yet".
 *
 * <p>⚠ **Next is disabled, not absent, and it is the sequencing rule made visible.** `profile.md:166`
 * — *"each step opens only after the previous one has saved successfully"* — means the Next button on
 * an unsaved pane would lead somewhere the applicant cannot be. {@link WizardService.canOpen} fails
 * closed while the meter has not answered, so the button is briefly disabled on arrival; that is the
 * deliberate direction, because admitting early walks someone into a save the server refuses.
 */
@Component({
  standalone: true,
  selector: 'hpd-wizard-footer',
  imports: [MatIconModule, TranslateModule],
  template: `
    <!--
      Back, Save and Next reuse healthConnect.actions.*, and Submit reuses
      healthConnect.onboarding.actions.submit — all four already exist in all four catalogues. Only
      stepCounter and nextLocked are new copy, which is the right ratio for a nav row: a wizard-local
      "Save" would be a fifth translation of one word.
    -->
    <footer class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-hpd-border pt-4">
      <p class="m-0 text-xs font-semibold text-hpd-muted" data-cy="wizardStepCounter">
        {{ 'healthConnect.onboarding.wizard.stepCounter' | translate: { step: stepNumber(), total: total } }}
      </p>

      <div class="flex flex-wrap items-center gap-2">
        @if (previousPane()) {
          <button
            class="hpd-btn hpd-btn-ghost hpd-focusable"
            type="button"
            data-cy="wizardBack"
            [disabled]="saving"
            (click)="goTo(previousPane()!)"
          >
            <mat-icon aria-hidden="true" class="!text-base">arrow_back</mat-icon>
            {{ 'healthConnect.actions.back' | translate }}
          </button>
        }

        <button class="hpd-btn hpd-btn-ghost hpd-focusable" type="button" data-cy="wizardSave" [disabled]="saving" (click)="save.emit()">
          {{ 'healthConnect.actions.save' | translate }}
        </button>

        @if (nextPane()) {
          <button
            class="hpd-btn hpd-btn-primary hpd-focusable"
            type="button"
            data-cy="wizardNext"
            [disabled]="saving || !nextOpenable()"
            [attr.title]="nextOpenable() ? null : ('healthConnect.onboarding.wizard.nextLocked' | translate)"
            (click)="goTo(nextPane()!)"
          >
            {{ 'healthConnect.actions.next' | translate }}
            <mat-icon aria-hidden="true" class="!text-base">arrow_forward</mat-icon>
          </button>
        } @else {
          <button
            class="hpd-btn hpd-btn-primary hpd-focusable"
            type="button"
            data-cy="wizardSubmit"
            [disabled]="saving || submitDisabled"
            (click)="submitted.emit()"
          >
            {{ 'healthConnect.onboarding.actions.submit' | translate }}
          </button>
        }
      </div>

      @if (nextPane() && !nextOpenable()) {
        <!--
          Said rather than only implied by a disabled button. role="status" and not "alert": this is
          the ordinary state of an unfinished pane, not a refusal of something the reader attempted —
          the same distinction backlog.md rows 204-208 settled on the async-state pages.
        -->
        <p class="m-0 basis-full text-xs text-hpd-muted" role="status" aria-live="polite" data-cy="wizardNextLocked">
          {{ 'healthConnect.onboarding.wizard.nextLocked' | translate }}
        </p>
      }
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class WizardFooterComponent {
  /** Which pane this footer belongs to. Everything else about the chrome follows from it. */
  @Input({ required: true }) set pane(value: WizardPane) {
    this.currentPane.set(value);
  }

  /** Disables everything while a request is in flight, so nothing is submitted twice. */
  @Input() saving = false;

  /**
   * The last pane's Submit, disabled for a reason its own pane knows — unticked consent, or no role
   * chosen. ⚠ Not the same thing as {@link saving}, and not a sequencing question either: whether the
   * *pane* may open is this component's business, whether its form is answerable is the pane's.
   */
  @Input() submitDisabled = false;

  @Output() readonly save = new EventEmitter<void>();

  /**
   * ⚠ Named `submitted` rather than `submit`, which `@angular-eslint/no-output-native` refuses: an
   * output named for a standard DOM event shadows the real one, so a host listening for a form
   * submit would receive this instead.
   */
  @Output() readonly submitted = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly wizard = inject(WizardService);

  private readonly currentPane = signal<WizardPane>(WIZARD_PANES[0]);

  readonly total = WIZARD_PANES.length;
  readonly stepNumber = computed(() => WIZARD_PANES.indexOf(this.currentPane()) + 1);
  readonly previousPane = computed(() => this.wizard.previous(this.currentPane()));
  readonly nextPane = computed(() => this.wizard.next(this.currentPane()));

  /**
   * Whether the pane Next leads to may be opened.
   *
   * <p>⚠ **Read as a computed over the meter's signal**, so it re-evaluates when a save moves the
   * progress — otherwise Next stays disabled after the applicant has just satisfied the step, which
   * reads as a broken button.
   */
  readonly nextOpenable = computed(() => {
    const next = this.nextPane();
    return next === null ? false : this.wizard.canOpen(next);
  });

  goTo(pane: WizardPane): void {
    void this.router.navigateByUrl(wizardPanePath(pane));
  }
}
