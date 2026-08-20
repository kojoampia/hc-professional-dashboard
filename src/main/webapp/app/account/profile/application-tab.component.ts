import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import SharedModule from 'app/shared/shared.module';
import { AlertService } from 'app/core/util/alert.service';
import { CareersHandoffService } from 'app/core/careers/careers-handoff.service';
import { OnboardingProgressService } from 'app/core/onboarding/onboarding-progress.service';
import { OnboardingApiService, OnboardingApplicationDto } from 'app/health-connect/api/onboarding-api.service';

const REQUESTABLE_ROLES = [
  'ROLE_DOCTOR',
  'ROLE_NURSE',
  'ROLE_PARAMEDIC',
  'ROLE_PHARMACIST',
  'ROLE_THERAPIST',
  'ROLE_CARER',
  'ROLE_ANGEL',
  'ROLE_CHEMIST',
  'ROLE_TECHNICIAN',
] as const;

/**
 * The application itself: consent and requested role up front, submission at the end, status
 * throughout.
 *
 * <p>What the applicant controls, as opposed to the profile and document tabs which hold the data
 * they supply. Three states in one tab because they are three points on one line — you consent,
 * you fill everything in, you submit — and splitting them across tabs would hide the last step
 * behind a tab nobody opens until they already know it is there.
 *
 * <p>Submission is offered only when the server says every requirement is met. The button would
 * otherwise 400 on the mandatory-document guard, which reads as a broken page rather than as
 * "you have not finished".
 */
@Component({
  standalone: true,
  selector: 'hpd-application-tab',
  imports: [SharedModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './application-tab.component.html',
})
export default class ApplicationTabComponent implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly alertService = inject(AlertService);
  private readonly careersHandoff = inject(CareersHandoffService);
  readonly progressService = inject(OnboardingProgressService);

  readonly roles = REQUESTABLE_ROLES;
  readonly application = signal<OnboardingApplicationDto | null>(null);
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly busy = signal(false);

  readonly consentForm = new FormGroup({
    // No silent default, per the careers handoff contract: a visiting physician who does not notice
    // a pre-selected "nurse" is filed as one.
    requestedRole: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    consentAccepted: new FormControl<boolean>(false, { nonNullable: true, validators: Validators.requiredTrue }),
  });

  ngOnInit(): void {
    this.applyCareersHandoff();
    this.load();
  }

  /** Pre-selects the careers track; an unknown or absent value changes nothing. */
  private applyCareersHandoff(): void {
    const track = this.careersHandoff.peek()?.track;
    if (track) {
      this.consentForm.patchValue({ requestedRole: track });
    }
  }

  load(): void {
    this.loadState.set('loading');
    this.api.getOwnApplication().subscribe({
      next: application => {
        this.application.set(application);
        this.loadState.set('ready');
      },
      // 404 is "not applied yet" — the consent form, not an error.
      error: err => {
        this.application.set(null);
        this.loadState.set(err?.status === 404 ? 'ready' : 'error');
      },
    });
  }

  start(): void {
    if (this.consentForm.invalid || this.busy()) {
      this.consentForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const { requestedRole } = this.consentForm.getRawValue();
    this.api.startApplication(requestedRole, this.careersHandoff.peek()?.src ?? null).subscribe({
      next: application => {
        this.application.set(application);
        this.busy.set(false);
        this.alertService.showToast('healthConnect.onboarding.toast.started');
        this.progressService.refresh();
      },
      error: () => this.busy.set(false),
    });
  }

  submit(): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    // completeProfile first: the server's state machine requires PROFILE_COMPLETED before
    // CREDENTIAL_REVIEW, and submitting straight from APPLICATION_STARTED is a 409.
    this.api.completeProfile().subscribe({
      next: () => this.reallySubmit(),
      // Already past that step — carry on rather than treating a legal state as a failure.
      error: () => this.reallySubmit(),
    });
  }

  private reallySubmit(): void {
    this.api.submit().subscribe({
      next: application => {
        this.application.set(application);
        this.busy.set(false);
        this.alertService.showToast('healthConnect.onboarding.toast.submitted');
        this.progressService.refresh();
      },
      error: () => this.busy.set(false),
    });
  }

  /** Editable states are the ones where submitting is the applicant's next move. */
  get canSubmit(): boolean {
    const status = this.application()?.status;
    const editable = status === 'APPLICATION_STARTED' || status === 'PROFILE_COMPLETED' || status === 'RETURNED_FOR_CORRECTION';
    return editable && this.progressService.complete() === true && !this.busy();
  }
}
