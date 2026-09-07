import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import SharedModule from 'app/shared/shared.module';
import { AlertService } from 'app/core/util/alert.service';
import { OnboardingProgressService } from 'app/core/onboarding/onboarding-progress.service';
import FileUploadTriggerComponent from 'app/shared/health-connect/form-controls/file-upload-trigger.component';
import {
  OnboardingApiService,
  OnboardingDocumentDto,
  OnboardingDocumentType,
  isLiveDocument,
} from 'app/health-connect/api/onboarding-api.service';

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
 * Credentialing documents, as a tab on the profile page.
 *
 * <p>Four are mandatory — certificate, licence with an expiry date, a government identity card, and
 * a passport photo — and the server refuses to advance an application without them. The checklist
 * here is rendered from the server's own requirement list rather than recomputed, so it cannot tell
 * a clinician they are done while the service disagrees.
 *
 * <p>Every successful upload refreshes the shared progress, because a document is one of the eight
 * things the meter counts and a figure that only moved on reload would read as a broken meter.
 */
@Component({
  standalone: true,
  selector: 'hpd-documents-tab',
  imports: [SharedModule, ReactiveFormsModule, FileUploadTriggerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './documents-tab.component.html',
})
export default class DocumentsTabComponent implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly alertService = inject(AlertService);
  private readonly progressService = inject(OnboardingProgressService);

  readonly uploadableTypes = UPLOADABLE_TYPES;
  readonly documents = signal<readonly OnboardingDocumentDto[]>([]);
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly uploading = signal(false);

  /** The four the server counts, straight from its own answer — never re-derived here. */
  readonly mandatory = computed(() =>
    (this.progressService.progress()?.requirements ?? []).filter(requirement =>
      ['certificate', 'license', 'identity', 'photo'].includes(requirement.key),
    ),
  );

  readonly uploadForm = new FormGroup({
    type: new FormControl<OnboardingDocumentType>('CERTIFICATE', { nonNullable: true, validators: Validators.required }),
    otherLabel: new FormControl<string>('', { nonNullable: true }),
    expiryDate: new FormControl<string>('', { nonNullable: true }),
    supersedesDocumentId: new FormControl<string>('', { nonNullable: true }),
  });

  /** The selected type, as a signal, so the "replaces" list can follow it. */
  private readonly selectedType = signal<OnboardingDocumentType>(this.uploadForm.controls.type.value);

  /**
   * The documents this upload could be replacing: the caller's own live rows of the selected type.
   *
   * <p>Naming one is the only thing that archives it (backlog.md item 20). The server used to infer
   * the replacement from the type alone, which is not a fact it has — an ACLS certificate and a
   * re-scanned BSc certificate are the same request, and inferring archived the wrong one, after
   * which nobody could verify or reject it and it never reached the compliance watchlist again. Only
   * the clinician knows, so the clinician is asked. Leaving it on "nothing" adds a document, which is
   * what every upload did before that item.
   */
  readonly replaceable = computed(() =>
    this.documents().filter(document => isLiveDocument(document) && document.type === this.selectedType()),
  );

  /** A licence expiring in the past is never a renewal — see the same rule server-side. */
  readonly today = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {
    this.load();
    // A row of one type cannot be replaced by a document of another, so the choice cannot outlive the
    // type that produced it.
    this.uploadForm.controls.type.valueChanges.subscribe(type => {
      this.selectedType.set(type);
      this.uploadForm.controls.supersedesDocumentId.setValue('');
    });
  }

  /**
   * Whether a row has been archived by a later upload of the same credential (backlog.md item 20).
   *
   * <p>Renewing marks the old document rather than deleting it, and this list deliberately keeps
   * showing it — a clinician's credential history is theirs to read, and a renewal that made the
   * previous licence vanish would look like a deletion. It is labelled instead, so an old expiry date
   * beside a current one is not read as a compliance problem.
   */
  archived(document: OnboardingDocumentDto): boolean {
    return !isLiveDocument(document);
  }

  load(): void {
    this.loadState.set('loading');
    this.api.listDocuments().subscribe({
      next: documents => {
        this.documents.set(documents);
        this.loadState.set('ready');
      },
      // No application yet means no documents yet, which is an empty list rather than a failure.
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

  upload(files: readonly File[]): void {
    const file = files[0];
    if (!file || this.uploading()) {
      return;
    }
    const { type, otherLabel, expiryDate, supersedesDocumentId } = this.uploadForm.getRawValue();
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
          this.progressService.refresh();
        },
        error: () => this.uploading.set(false),
      });
  }

  rejectedUpload(): void {
    this.alertService.showToast('healthConnect.profile.documents.rejected');
  }
}
