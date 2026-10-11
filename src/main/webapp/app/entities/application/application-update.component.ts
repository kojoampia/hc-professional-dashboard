import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import SharedModule from 'app/shared/shared.module';
import { AlertService } from 'app/core/util/alert.service';
import { CareersHandoffService } from 'app/core/careers/careers-handoff.service';
import { OnboardingApiService } from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { USER_AUTHORITIES } from 'app/account/user/authority.enum';
import WizardFooterComponent from 'app/shared/health-connect/wizard/wizard-footer.component';
import { ProfessionalApplication, applicantHolds } from './model';

/**
 * **Step 4 — application role and consent** (`profile.md:236-263`), the wizard's last pane.
 *
 * <h2>Save and Submit are two server operations, not one button twice</h2>
 *
 * <table>
 *   <tr><th></th><th>incomplete</th><th>complete</th></tr>
 *   <tr><td><b>Save</b> (`PUT /me`)</td><td>stores, 200, no transition, no event</td>
 *       <td>stores, advances to `CREDENTIAL_REVIEW`, publishes</td></tr>
 *   <tr><td><b>Submit</b> (`PUT /me/submit`)</td><td><b>stores nothing</b>, 400 naming the missing
 *       requirement keys</td><td>stores, advances, publishes</td></tr>
 * </table>
 *
 * <p>⚠ **A second Save answers 200 and a second Submit answers 409.** `OnboardingService` checks
 * `LEGAL_TRANSITIONS` *before* transitioning rather than letting the state machine refuse, so saving
 * an application already in `CREDENTIAL_REVIEW` stores the answers and returns it unadvanced —
 * repeatable by design. Submit is not: saying "I am finished" twice is a conflict in a way that
 * saving twice is not. **So this pane stays editable after submission** (the wizard's post-submit
 * rule) while the Submit button does not stay offered.
 *
 * <p>⛔ **And the wizard never writes a status backwards.** `CREDENTIAL_REVIEW →
 * PROFILE_COMPLETED` is not in `LEGAL_TRANSITIONS`; the 409 is not something to handle here because
 * nothing attempts it. `WizardService` exposes no such call and its spec asserts so.
 *
 * <h2>The first call is `POST`, and after that it is `PUT`</h2>
 *
 * <p>An account with no application gets a 404 from `getOwnApplication` — the normal state for
 * everyone except a careers hire — so Save on a 404 **starts** the application
 * (`POST /api/professional-application`) and Save thereafter updates it. A second `POST` is a 409
 * *"An application already exists for this account"*, which is why the branch is on what was loaded
 * rather than on optimism.
 *
 * <h2>⭐ The careers track pre-selects the role, and degrades to nothing</h2>
 *
 * <p>`careers-handoff-contract.md`: `web.abofonsa.com/careers` links to
 * `/register?track=<AuthorityRole>&locale=…&src=web-careers`, and `CareersHandoffService` keeps the
 * values in **localStorage** because the activation email opens a fresh tab. ⛔ **Unknown values are
 * dropped rather than raising, and the pane works with no parameters at all** — preserve that: a
 * cross-device activation loses the value and the contract depends on the degradation. ⚠ And there is
 * **no silent default**: *"a visiting physician who does not notice a pre-selected nurse is filed as
 * one"*, so an absent track leaves the dropdown empty and required.
 *
 * <p>⚠ **`src` is the attribution and goes on the `POST` only.** The review queue reads
 * `application.source` and the WP7 funnel counts it; it is set when the application is created and is
 * not re-sent on every save.
 *
 * <p>⭐ **The role list is derived, not written out.** `USER_AUTHORITIES` is `CAREER_AUTHORITIES`
 * is a filter of `Authority` — the eight disciplines, never `ROLE_ADMIN`, never `ROLE_USER`, which
 * are the two the server refuses with a 400 and the same two the careers service leaves out of
 * `KNOWN_TRACKS`. ⛔ `ApplicationTabComponent` has a hand-written `REQUESTABLE_ROLES` beside it; that
 * was the seventh copy of a documented cross-repo invariant and it retires with the tab in T6. A new
 * surface must not make an eighth.
 */
@Component({
  standalone: true,
  selector: 'hpd-application-update',
  imports: [SharedModule, ReactiveFormsModule, WizardFooterComponent],
  templateUrl: './application-update.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ApplicationUpdateComponent implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly alertService = inject(AlertService);
  private readonly careersHandoff = inject(CareersHandoffService);
  readonly progressService = inject(OnboardingProgressService);

  readonly roles = USER_AUTHORITIES;
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly saving = signal(false);
  readonly application = signal<ProfessionalApplication | null>(null);

  /** Whether the track parameter chose the role, so the screen can say where it came from. */
  readonly prefilledFromCareers = signal(false);

  readonly form = new FormGroup({
    // No silent default, per the careers contract. Required, so an empty select cannot be saved.
    authority: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    // requiredTrue, not required: `agreed: false` is a 400 server-side with nothing stored, and the
    // consent is the thing being recorded rather than a box to acknowledge.
    agreed: new FormControl<boolean>(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  /** Whether Submit is the applicant's next move — see {@link applicantHolds} for what that excludes. */
  readonly canSubmit = computed(
    () => applicantHolds(this.application()?.status) && this.progressService.complete() === true && !this.saving(),
  );

  /** Why Submit is not offered, so a disabled button is not the whole explanation. */
  readonly submitBlockedReason = computed<'incomplete' | 'alreadySubmitted' | null>(() => {
    if (this.canSubmit() || this.saving()) {
      return null;
    }
    const status = this.application()?.status;
    if (status !== undefined && status !== null && !applicantHolds(status)) {
      return 'alreadySubmitted';
    }
    return 'incomplete';
  });

  /** A reviewer's note on a returned application — the one lifecycle message this pane must show. */
  readonly correctionNotes = computed(() =>
    this.application()?.status === 'RETURNED_FOR_CORRECTION' ? this.application()?.correctionNotes ?? null : null,
  );

  ngOnInit(): void {
    this.progressService.load();
    this.applyCareersHandoff();
    this.load();
  }

  /** Pre-selects the careers track; an unknown or absent value changes nothing. */
  private applyCareersHandoff(): void {
    const track = this.careersHandoff.peek()?.track;
    if (track) {
      this.form.patchValue({ authority: track }, { emitEvent: false });
      this.prefilledFromCareers.set(true);
    }
  }

  load(): void {
    this.loadState.set('loading');
    this.api.getOwnApplication().subscribe({
      next: application => {
        this.application.set(application);
        // The stored answers win over the careers pre-selection: an application that exists has
        // already recorded what the applicant chose, and overwriting it from a stale localStorage
        // value would change their declared discipline behind them.
        this.form.patchValue(
          { authority: application.authority ?? this.form.controls.authority.value, agreed: application.agreed === true },
          { emitEvent: false },
        );
        if (application.authority) {
          this.prefilledFromCareers.set(false);
        }
        this.loadState.set('ready');
      },
      // 404 is "not applied yet" — the consent form, not an error. Every clinician seeded or invited
      // rather than hired through the careers page is in this state.
      error: err => {
        this.application.set(null);
        this.loadState.set(err?.status === 404 ? 'ready' : 'error');
      },
    });
  }

  /** `profile.md:262`'s **Save**: store the consent and the requested authority. */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving()) {
      return;
    }
    const { authority } = this.form.getRawValue();
    this.saving.set(true);
    const write = this.application()
      ? this.api.saveConsent(authority)
      : // `src` is the careers attribution and belongs to the creation only — the review queue reads
        // it and the WP7 funnel counts it.
        this.api.startApplication(authority, this.careersHandoff.peek()?.src ?? null);
    write.subscribe({
      next: application => {
        this.application.set(application);
        this.saving.set(false);
        this.alertService.showToast('healthConnect.onboarding.toast.started');
        this.progressService.refresh();
        // The track has done its work. Cleared so a later change of discipline is not silently
        // undone by a stale parameter on the next visit; the contract calls this the consume step.
        this.careersHandoff.clear();
      },
      error: () => this.saving.set(false),
    });
  }

  /**
   * `profile.md:262`'s **Submit**: sets `application.status` to `CREDENTIAL_REVIEW`.
   *
   * <p>⚠ **Through `transition()` server-side, not an assignment** — it validates `LEGAL_TRANSITIONS`
   * and appends an `OnboardingEvent`, and `PROFILE_COMPLETED → CREDENTIAL_REVIEW` is the only legal
   * move out. `ProfileResource`'s javadoc is the argument for caring: a status write that *"checks
   * nothing and appends nothing … leaves an application whose own history does not contain the
   * step."*
   *
   * <p>`completeProfile` first, for that reason: submitting straight from `APPLICATION_STARTED` is a
   * 409, and an application already past that step answers an error this must carry on through rather
   * than treat as a failure.
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving() || !this.canSubmit()) {
      return;
    }
    this.saving.set(true);
    this.api.completeProfile().subscribe({
      next: () => this.reallySubmit(),
      // Already past that step — a legal state, not a failure.
      error: () => this.reallySubmit(),
    });
  }

  private reallySubmit(): void {
    const { authority } = this.form.getRawValue();
    this.api.submit(authority).subscribe({
      next: application => {
        this.application.set(application);
        this.saving.set(false);
        this.alertService.showToast('healthConnect.onboarding.toast.submitted');
        this.progressService.refresh();
      },
      error: () => this.saving.set(false),
    });
  }
}
