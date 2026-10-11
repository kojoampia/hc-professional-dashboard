import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import SharedModule from 'app/shared/shared.module';
import { AlertService } from 'app/core/util/alert.service';
import {
  OnboardingApiService,
  OnboardingDocumentDto,
  OnboardingDocumentType,
  isLiveDocument,
} from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { readWizardProfileId } from 'app/onboarding/wizard.service';
import FileUploadTriggerComponent from 'app/shared/health-connect/form-controls/file-upload-trigger.component';
import WizardFooterComponent from 'app/shared/health-connect/wizard/wizard-footer.component';
import { ProfileService } from 'app/entities/profile/service';

/**
 * The nine credentials an applicant may upload.
 *
 * <p>⛔ **`AVATAR` is absent and that is structural, not an omission.** `OnboardingDocumentType` is
 * the nine-value union precisely so this list cannot contain it, and the generic
 * `POST /api/personal-document` **refuses** `AVATAR` by name and points at the avatar path. An avatar
 * stored as a credential would also let a selfie satisfy `REQ_PHOTO` and carry an application to
 * `CREDENTIAL_REVIEW` (`backlog.md` row 232).
 *
 * <p>Deliberately the same nine, in the same order, as `documents-tab.component.ts`'s
 * `UPLOADABLE_TYPES` — one vocabulary rendered by two surfaces until T6 retires the tab.
 */
const UPLOADABLE_TYPES: OnboardingDocumentType[] = [
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

/**
 * The four requirement keys step 3 answers — the server's own names for its mandatory set.
 *
 * <p>⛔ **Four, and `profile.md` never states it.** `requireMandatoryDocuments` 400s a submission
 * without a `CERTIFICATE`, a `LICENSE` **with an expiry date**, one of
 * `{PASSPORT, GHANACARD, DRIVERLICENSE, VOTERCARD}` and a `PASSPHOTO` — the same four for every
 * discipline. `profile-addendum.md` § 3 T2 is blunt about the consequence of ignoring it: *"a step-3
 * pane that does not enforce this produces a wizard whose final button always fails."*
 *
 * <p>⭐ **Enforced by rendering the server's answer, not by recomputing it.** The ticks come from
 * `OnboardingProgressDto.requirements`, so this pane cannot tell an applicant they are finished while
 * the service disagrees — and ⚠ `requireMandatoryDocuments` runs **at submit, not per upload**, which
 * is exactly why a client-side count would read 100% behind a Submit that 400s.
 */
const MANDATORY_REQUIREMENT_KEYS: readonly string[] = ['certificate', 'license', 'identity', 'photo'];

/**
 * **Step 3 — upload personal documents** (`profile.md:204-234`), as the wizard's third pane.
 *
 * <h2>It reads the profile from session storage, and then asks the server anyway</h2>
 *
 * <p>`profile.md:206` — *"open the Documents dialog, reading the profile from session storage"* — and
 * step 2 put it there. ⚠ **What it is read for is the id, and nothing else.**
 * `profile-addendum.md` § 5 closed the hazard this used to be and recorded what survives: *"session
 * storage for the step cursor only; step 3 needs just `Profile.id`, which the step-2 response
 * carries."*
 *
 * <p>⛔ **And it falls back to `GET /api/profile` when the store is empty**, because three ordinary
 * paths produce that: a deep link straight to this pane, a reload (session storage survives a reload
 * but not a new tab), and private-browsing mode where `setItem` throws and step 2 swallowed it. A
 * pane that refused to work without the store would be a pane that breaks on a refresh.
 *
 * <p>⚠ **`profileId` is never sent either way.** The server derives it from the caller's own profile
 * — *"`PersonalDocument.profileId` is server-derived"* — and `ownProfile` refuses an upload from a
 * caller with no profile, with *"Create your professional profile before uploading documents"*. So
 * step 3 depending on step 2 is enforced server-side, and the id read here is for the screen to say
 * whose documents these are, not for the request.
 */
@Component({
  standalone: true,
  selector: 'hpd-personal-document-update',
  imports: [SharedModule, ReactiveFormsModule, FileUploadTriggerComponent, WizardFooterComponent],
  templateUrl: './personal-document-update.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PersonalDocumentUpdateComponent implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly profileService = inject(ProfileService);
  private readonly alertService = inject(AlertService);
  private readonly progressService = inject(OnboardingProgressService);

  readonly uploadableTypes = UPLOADABLE_TYPES;
  readonly acceptedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  /** `api/`'s `MAX_BYTES`, on the **decoded** bytes. Base64 inflates the request by 4/3 above it. */
  readonly maximumBytes = 5_000_000;

  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly uploading = signal(false);
  readonly documents = signal<readonly OnboardingDocumentDto[]>([]);

  /**
   * The id of the profile these documents are filed against — the step cursor, and the whole of what
   * this pane reads from the handoff.
   *
   * <p>⚠ **Not rendered and not sent.** `PersonalDocument.profileId` is server-derived: the upload
   * resolves it from the caller's own profile and the client never names it. So this is not an
   * argument to any request; what it says is *step 2 has been saved*, which is what
   * `profile.md:206`'s handoff is for. It held a whole `Profile` until review — 39 fields, of which
   * nothing read any but the id. See `storeWizardProfileId`.
   */
  readonly profileId = signal<string | null>(null);

  readonly uploadForm = new FormGroup({
    type: new FormControl<OnboardingDocumentType>('CERTIFICATE', { nonNullable: true, validators: [Validators.required] }),
    otherLabel: new FormControl<string>('', { nonNullable: true }),
    expiryDate: new FormControl<string>('', { nonNullable: true }),
    supersedesDocumentId: new FormControl<string>('', { nonNullable: true }),
  });

  private readonly selectedType = signal<OnboardingDocumentType>(this.uploadForm.controls.type.value);

  /** The four the server counts, straight from its own answer — never re-derived here. */
  readonly mandatory = computed(() =>
    (this.progressService.progress()?.requirements ?? []).filter(requirement => MANDATORY_REQUIREMENT_KEYS.includes(requirement.key)),
  );

  readonly mandatoryOutstanding = computed(() => this.mandatory().filter(requirement => !requirement.done).length);

  /**
   * The caller's own live rows of the selected type — what this upload could be replacing.
   *
   * <p>Naming one is the only thing that archives it (`backlog.md` item 20): the server cannot infer
   * it, because a renewed certificate and a second, different certificate are the same request.
   */
  readonly replaceable = computed(() =>
    this.documents().filter(document => isLiveDocument(document) && document.type === this.selectedType()),
  );

  /** A licence expiring in the past is never a renewal — the same rule the server applies. */
  readonly today = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {
    this.progressService.load();
    this.adoptProfile();
    this.load();
    // A row of one type cannot be replaced by a document of another, so the choice cannot outlive
    // the type that produced it.
    this.uploadForm.controls.type.valueChanges.subscribe(type => {
      this.selectedType.set(type);
      this.uploadForm.controls.supersedesDocumentId.setValue('');
    });
  }

  /** Session storage first (`profile.md:206`), then the server. See the class note on both. */
  private adoptProfile(): void {
    const stored = readWizardProfileId();
    if (stored) {
      this.profileId.set(stored);
      return;
    }
    this.profileService.find().subscribe({
      next: profile => this.profileId.set(profile.id ?? null),
      // 404 here means step 2 has not been saved. The footer's Next will not route an applicant
      // past it, and the upload's own `ownProfile` refuses in the server's words — so this pane has
      // nothing to report about it, and the id simply stays null.
      error: () => this.profileId.set(null),
    });
  }

  load(): void {
    this.loadState.set('loading');
    this.api.listDocuments().subscribe({
      next: documents => {
        this.documents.set(documents);
        this.loadState.set('ready');
      },
      // No profile yet means no documents yet, which is an empty list rather than a failure.
      error: err => this.loadState.set(err?.status === 404 ? 'ready' : 'error'),
    });
  }

  /** A licence with no expiry does not satisfy the requirement — the sweep would have nothing to check. */
  get expiryRequired(): boolean {
    return this.uploadForm.controls.type.value === 'LICENSE';
  }

  get otherLabelRequired(): boolean {
    return this.uploadForm.controls.type.value === 'OTHER';
  }

  archived(document: OnboardingDocumentDto): boolean {
    return !isLiveDocument(document);
  }

  upload(files: readonly File[]): void {
    const file = files[0];
    if (!file || this.uploading()) {
      return;
    }
    const { type, otherLabel, expiryDate, supersedesDocumentId } = this.uploadForm.getRawValue();
    // Two of the server's seven 400s, checked here so the applicant is told before a request rather
    // than after one. The server refuses them either way — this is not the gate.
    if ((this.expiryRequired && !expiryDate) || (this.otherLabelRequired && !otherLabel)) {
      this.uploadForm.markAllAsTouched();
      return;
    }

    this.uploading.set(true);
    this.api
      .uploadDocument(file, type, {
        otherLabel: otherLabel || undefined,
        expiryDate: expiryDate || undefined,
        supersedesDocumentId: supersedesDocumentId || undefined,
      })
      .subscribe({
        next: () => {
          this.uploading.set(false);
          this.uploadForm.patchValue({ otherLabel: '', expiryDate: '', supersedesDocumentId: '' });
          this.alertService.showToast('healthConnect.onboarding.toast.documentUploaded');
          this.load();
          // A document is one of the nine requirements, and the footer's Next is gated on the step.
          this.progressService.refresh();
        },
        error: () => this.uploading.set(false),
      });
  }

  rejectedUpload(): void {
    this.alertService.showToast('healthConnect.profile.documents.rejected');
  }

  /** Save on this pane is the list itself: a document is stored when it is uploaded. */
  save(): void {
    this.load();
    this.progressService.refresh();
  }
}
