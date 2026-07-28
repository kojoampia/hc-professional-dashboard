import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AlertService } from 'app/core/util/alert.service';
import FileUploadTriggerComponent from '../../shared/health-connect/form-controls/file-upload-trigger.component';
import {
  OnboardingApiService,
  OnboardingApplicationDto,
  OnboardingDocumentDto,
  OnboardingDocumentType,
  OnboardingEventDto,
  OnboardingProfileDto,
} from '../api/onboarding-api.service';

export type OnboardingStep = 'consent' | 'profile' | 'contact' | 'documents' | 'review' | 'status';

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

const IDENTITY_TYPES: OnboardingDocumentType[] = ['PASSPORT', 'GHANACARD', 'DRIVERLICENSE', 'VOTERCARD'];
const EDITABLE_STATUSES = new Set(['APPLICATION_STARTED', 'PROFILE_COMPLETED', 'RETURNED_FOR_CORRECTION']);

/**
 * Applicant onboarding wizard (professional-onboarding-workflow.md WP4):
 * consent → profile → address/contact → documents → review/submit, then a
 * status timeline. The active step is driven by the server-side application
 * status; corrections re-open the editable steps with the reviewer's notes.
 */
@Component({
  standalone: true,
  selector: 'hpd-onboarding-page',
  imports: [FileUploadTriggerComponent, MatIconModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './onboarding-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class OnboardingPageComponent implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly alertService = inject(AlertService);

  readonly requestableRoles = REQUESTABLE_ROLES;
  readonly identityTypes = IDENTITY_TYPES;
  readonly documentTypes: OnboardingDocumentType[] = [
    'CERTIFICATE',
    'LICENSE',
    'PASSPORT',
    'GHANACARD',
    'DRIVERLICENSE',
    'VOTERCARD',
    'PASSPHOTO',
    'NHIS',
    'OTHER',
  ];

  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly application = signal<OnboardingApplicationDto | null>(null);
  readonly documents = signal<OnboardingDocumentDto[]>([]);
  readonly eventTrail = signal<OnboardingEventDto[]>([]);
  readonly activeStep = signal<OnboardingStep>('consent');
  readonly saving = signal(false);

  readonly editable = computed(() => {
    const status = this.application()?.status;
    return status == null || EDITABLE_STATUSES.has(status);
  });

  readonly mandatoryChecklist = computed(() => {
    const docs = this.documents();
    return {
      certificate: docs.some(d => d.type === 'CERTIFICATE'),
      license: docs.some(d => d.type === 'LICENSE' && !!d.expiryDate),
      identity: docs.some(d => IDENTITY_TYPES.includes(d.type)),
      photo: docs.some(d => d.type === 'PASSPHOTO'),
    };
  });

  readonly mandatoryComplete = computed(() => Object.values(this.mandatoryChecklist()).every(Boolean));

  readonly consentForm = new FormGroup({
    requestedRole: new FormControl<string>('ROLE_NURSE', { nonNullable: true, validators: Validators.required }),
    consentAccepted: new FormControl<boolean>(false, { nonNullable: true, validators: Validators.requiredTrue }),
  });

  readonly profileForm = new FormGroup({
    firstName: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    middleNames: new FormControl<string>('', { nonNullable: true }),
    lastName: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    birthDate: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    sex: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    mobilePhone: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    title: new FormControl<string>('', { nonNullable: true }),
    cardType: new FormControl<string>('GHANACARD', { nonNullable: true, validators: Validators.required }),
    cardNumber: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
  });

  readonly contactForm = new FormGroup({
    digitalAddress: new FormControl<string>('', { nonNullable: true }),
    streetAddress: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    town: new FormControl<string>('', { nonNullable: true }),
    city: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    district: new FormControl<string>('', { nonNullable: true }),
    region: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    country: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    contactName: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    contactRelationship: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    contactPhone: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
  });

  readonly uploadForm = new FormGroup({
    type: new FormControl<OnboardingDocumentType>('CERTIFICATE', { nonNullable: true, validators: Validators.required }),
    otherLabel: new FormControl<string>('', { nonNullable: true }),
    expiryDate: new FormControl<string>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadState.set('loading');
    this.api.getOwnApplication().subscribe({
      next: application => {
        this.application.set(application);
        this.activeStep.set(this.stepForStatus(application));
        this.loadState.set('ready');
        this.refreshProfile();
        this.refreshDocuments();
        this.refreshEvents(application);
      },
      error: err => {
        if (err?.status === 404) {
          this.application.set(null);
          this.activeStep.set('consent');
          this.loadState.set('ready');
        } else {
          this.loadState.set('error');
        }
      },
    });
  }

  stepForStatus(application: OnboardingApplicationDto | null): OnboardingStep {
    if (!application) {
      return 'consent';
    }
    switch (application.status) {
      case 'APPLICATION_STARTED':
        return 'profile';
      case 'PROFILE_COMPLETED':
        return 'documents';
      case 'RETURNED_FOR_CORRECTION':
        return 'review';
      default:
        return 'status';
    }
  }

  goTo(step: OnboardingStep): void {
    if (this.editable() || step === 'status') {
      this.activeStep.set(step);
    }
  }

  start(): void {
    if (this.consentForm.invalid) {
      this.consentForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.api.startApplication(this.consentForm.getRawValue().requestedRole).subscribe({
      next: application => {
        this.application.set(application);
        this.activeStep.set('profile');
        this.saving.set(false);
        this.alertService.showToast('healthConnect.onboarding.toast.started');
      },
      error: () => this.saving.set(false),
    });
  }

  saveProfileStep(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.persistProfile('contact');
  }

  saveContactStep(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    this.persistProfile('documents', true);
  }

  upload(files: readonly File[]): void {
    const file = files[0];
    if (!file) {
      return;
    }
    const { type, otherLabel, expiryDate } = this.uploadForm.getRawValue();
    this.saving.set(true);
    this.api.uploadDocument(file, type, { otherLabel: otherLabel || undefined, expiryDate: expiryDate || undefined }).subscribe({
      next: () => {
        this.saving.set(false);
        this.alertService.showToast('healthConnect.onboarding.toast.documentUploaded');
        this.refreshDocuments();
      },
      error: () => this.saving.set(false),
    });
  }

  submit(): void {
    this.saving.set(true);
    this.api.submit().subscribe({
      next: application => {
        this.application.set(application);
        this.activeStep.set('status');
        this.saving.set(false);
        this.alertService.showToast('healthConnect.onboarding.toast.submitted');
        this.refreshEvents(application);
      },
      error: () => this.saving.set(false),
    });
  }

  needsOtherLabel(): boolean {
    return this.uploadForm.getRawValue().type === 'OTHER';
  }

  needsExpiry(): boolean {
    return this.uploadForm.getRawValue().type === 'LICENSE';
  }

  private persistProfile(nextStep: OnboardingStep, completeTransition = false): void {
    this.saving.set(true);
    this.api.upsertProfile(this.buildProfilePayload()).subscribe({
      next: () => {
        if (completeTransition && this.application()?.status === 'APPLICATION_STARTED') {
          this.api.completeProfile().subscribe({
            next: application => {
              this.application.set(application);
              this.finishSave(nextStep);
            },
            error: () => this.saving.set(false),
          });
        } else {
          this.finishSave(nextStep);
        }
      },
      error: () => this.saving.set(false),
    });
  }

  private finishSave(nextStep: OnboardingStep): void {
    this.saving.set(false);
    this.activeStep.set(nextStep);
    this.alertService.showToast('healthConnect.onboarding.toast.saved');
  }

  private buildProfilePayload(): OnboardingProfileDto {
    const profile = this.profileForm.getRawValue();
    const contact = this.contactForm.getRawValue();
    return {
      firstName: profile.firstName,
      middleNames: profile.middleNames || null,
      lastName: profile.lastName,
      birthDate: profile.birthDate || null,
      sex: profile.sex || null,
      mobilePhone: profile.mobilePhone || null,
      email: profile.email || null,
      title: profile.title || null,
      cardType: profile.cardType || null,
      cardNumber: profile.cardNumber || null,
      address: {
        digitalAddress: contact.digitalAddress || null,
        streetAddress: contact.streetAddress || null,
        town: contact.town || null,
        city: contact.city || null,
        district: contact.district || null,
        region: contact.region || null,
        country: contact.country || null,
      },
      emergencyContact: {
        name: contact.contactName || null,
        relationship: contact.contactRelationship || null,
        phone: contact.contactPhone || null,
      },
    };
  }

  private refreshProfile(): void {
    this.api.getOwnProfile().subscribe({
      next: profile => this.prefill(profile),
      error: () => undefined,
    });
  }

  private refreshDocuments(): void {
    this.api.listDocuments().subscribe({
      next: documents => this.documents.set(documents),
      error: () => undefined,
    });
  }

  private refreshEvents(application: OnboardingApplicationDto): void {
    this.api.events(application.id).subscribe({
      next: events => this.eventTrail.set(events),
      error: () => undefined,
    });
  }

  private prefill(profile: OnboardingProfileDto): void {
    this.profileForm.patchValue({
      firstName: profile.firstName ?? '',
      middleNames: profile.middleNames ?? '',
      lastName: profile.lastName ?? '',
      birthDate: profile.birthDate ?? '',
      sex: profile.sex ?? '',
      mobilePhone: profile.mobilePhone ?? '',
      email: profile.email ?? '',
      title: profile.title ?? '',
      cardType: profile.cardType ?? 'GHANACARD',
      cardNumber: profile.cardNumber ?? '',
    });
    this.contactForm.patchValue({
      digitalAddress: profile.address?.digitalAddress ?? '',
      streetAddress: profile.address?.streetAddress ?? '',
      town: profile.address?.town ?? '',
      city: profile.address?.city ?? '',
      district: profile.address?.district ?? '',
      region: profile.address?.region ?? '',
      country: profile.address?.country ?? '',
      contactName: profile.emergencyContact?.name ?? '',
      contactRelationship: profile.emergencyContact?.relationship ?? '',
      contactPhone: profile.emergencyContact?.phone ?? '',
    });
  }
}
