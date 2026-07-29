import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { AlertService } from 'app/core/util/alert.service';
import { GatewayAdminApiService } from '../api/gateway-admin-api.service';
import {
  OnboardingApiService,
  OnboardingApplicationDto,
  OnboardingDocumentDto,
  OnboardingEventDto,
  OnboardingStatus,
} from '../api/onboarding-api.service';

/**
 * Reviewer/admin application detail (WP5): document verification, decisions,
 * organization + authority assignment, and access enablement — mirroring the
 * server-side state machine; every action is admin-gated at the route and API.
 */
@Component({
  standalone: true,
  selector: 'hpd-review-detail-page',
  imports: [MatIconModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './review-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReviewDetailPageComponent implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly gatewayAdmin = inject(GatewayAdminApiService);
  private readonly alertService = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly applicationId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly application = signal<OnboardingApplicationDto | null>(null);
  readonly documents = signal<OnboardingDocumentDto[]>([]);
  readonly eventTrail = signal<OnboardingEventDto[]>([]);
  readonly busy = signal(false);
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');

  readonly allDocumentsVerified = computed(
    () => this.documents().length > 0 && this.documents().every(d => d.verificationStatus === 'VERIFIED'),
  );

  readonly decisionForm = new FormGroup({
    reason: new FormControl<string>('', { nonNullable: true }),
    correctionNotes: new FormControl<string>('', { nonNullable: true }),
  });

  readonly organizationForm = new FormGroup({
    specialtyCategoryId: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    teamIds: new FormControl<string>('', { nonNullable: true }),
    supervisorProfileId: new FormControl<string>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadState.set('loading');
    this.api.getApplication(this.applicationId).subscribe({
      next: application => {
        this.application.set(application);
        this.loadState.set('ready');
        this.refreshDocuments();
        this.refreshEvents();
      },
      error: () => this.loadState.set('error'),
    });
  }

  status(): OnboardingStatus | null {
    return this.application()?.status ?? null;
  }

  verify(document: OnboardingDocumentDto): void {
    this.run(this.api.verifyDocument(document.id), 'healthConnect.review.toast.documentVerified', () => this.refreshDocuments());
  }

  reject(document: OnboardingDocumentDto): void {
    const reason = this.decisionForm.getRawValue().reason;
    if (!reason) {
      this.decisionForm.controls.reason.markAsTouched();
      return;
    }
    this.run(this.api.rejectDocument(document.id, reason), 'healthConnect.review.toast.documentRejected', () => this.refreshDocuments());
  }

  preview(document: OnboardingDocumentDto): void {
    this.api.documentContent(document.id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }

  decide(decision: OnboardingStatus): void {
    const { reason, correctionNotes } = this.decisionForm.getRawValue();
    if (decision !== 'APPROVED' && !reason) {
      this.decisionForm.controls.reason.markAsTouched();
      return;
    }
    this.run(
      this.api.decide(this.applicationId, decision, reason || undefined, correctionNotes || undefined),
      'healthConnect.review.toast.decided',
      application => this.afterTransition(application),
    );
  }

  assignOrganization(): void {
    if (this.organizationForm.invalid) {
      this.organizationForm.markAllAsTouched();
      return;
    }
    const raw = this.organizationForm.getRawValue();
    this.run(
      this.api.assignOrganization(this.applicationId, {
        specialtyCategoryId: raw.specialtyCategoryId,
        teamIds: raw.teamIds
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        supervisorProfileId: raw.supervisorProfileId || null,
      }),
      'healthConnect.review.toast.organizationAssigned',
      application => this.afterTransition(application),
    );
  }

  /** Gateway grants the authority (it owns users); the api records the state. */
  assignAuthority(): void {
    const application = this.application();
    if (!application?.login || !application.requestedRole) {
      return;
    }
    this.busy.set(true);
    this.gatewayAdmin.grantAuthority(application.login, application.requestedRole).subscribe({
      next: () => {
        this.api.markAuthorityAssigned(this.applicationId).subscribe({
          next: updated => {
            this.busy.set(false);
            this.alertService.showToast('healthConnect.review.toast.authorityAssigned');
            this.afterTransition(updated);
          },
          error: () => this.busy.set(false),
        });
      },
      error: () => this.busy.set(false),
    });
  }

  markRosterConfigured(): void {
    this.run(this.api.markRosterConfigured(this.applicationId), 'healthConnect.review.toast.rosterConfigured', a =>
      this.afterTransition(a),
    );
  }

  activate(): void {
    this.run(this.api.activate(this.applicationId), 'healthConnect.review.toast.activated', a => this.afterTransition(a));
  }

  suspend(): void {
    const reason = this.decisionForm.getRawValue().reason;
    if (!reason) {
      this.decisionForm.controls.reason.markAsTouched();
      return;
    }
    this.run(this.api.suspend(this.applicationId, reason), 'healthConnect.review.toast.suspended', a => this.afterTransition(a));
  }

  back(): void {
    void this.router.navigate(['/review']);
  }

  roleLabelKey(): string | null {
    const role = this.application()?.requestedRole;
    return role ? 'healthConnect.roles.' + role.replace('ROLE_', '').toLowerCase() : null;
  }

  private afterTransition(application: OnboardingApplicationDto): void {
    this.application.set(application);
    this.refreshEvents();
  }

  private refreshDocuments(): void {
    this.api.applicationDocuments(this.applicationId).subscribe({
      next: documents => this.documents.set(documents),
      error: () => undefined,
    });
  }

  private refreshEvents(): void {
    this.api.events(this.applicationId).subscribe({
      next: events => this.eventTrail.set(events),
      error: () => undefined,
    });
  }

  private run<T>(request: Observable<T>, toastKey: string, onNext: (v: T) => void): void {
    this.busy.set(true);
    request.subscribe({
      next: value => {
        this.busy.set(false);
        this.alertService.showToast(toastKey);
        onNext(value);
      },
      error: () => this.busy.set(false),
    });
  }
}
