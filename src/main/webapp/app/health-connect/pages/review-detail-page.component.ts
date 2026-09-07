import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { AlertService } from 'app/core/util/alert.service';
import { GatewayAdminApiService } from '../api/gateway-admin-api.service';
import {
  ONBOARDING_REQUIREMENT_KEYS,
  OnboardingApiService,
  OnboardingApplicationDto,
  OnboardingDocumentDto,
  OnboardingEventDto,
  OnboardingRequirementKey,
  OnboardingStatus,
  isLiveDocument,
} from '../api/onboarding-api.service';

/**
 * A refused transition, in the shape the card renders (backlog.md item 46).
 *
 * @param messageKey          headline, always a catalogue key so the operator reads it in their own
 *                            language. Chosen from the status, never from the server's wording.
 * @param missingRequirements requirement keys the service named as still outstanding, in catalogue
 *                            order; empty for every refusal that is not the completeness contract.
 * @param detail              the service's own sentence, shown only when no requirement list
 *                            explains the refusal. Untranslated by nature — it is a quotation, and
 *                            it is labelled as one — but it is the only thing that distinguishes
 *                            one 409 from another, so hiding it is what caused this defect.
 */
export interface ReviewActionFailure {
  messageKey: string;
  missingRequirements: OnboardingRequirementKey[];
  detail: string | null;
}

/**
 * Headline per HTTP status. Anything not listed falls back to `error.failed`.
 *
 * <p>Keyed on the status rather than on the service's message because the message is English prose
 * that this repo must not mirror: a reword on the service side would silently stop matching, and
 * the operator would be back to being told nothing. The one refusal worth naming exactly — the
 * completeness contract — is recognised by the requirement keys it lists instead, which are a wire
 * vocabulary the two sides already share.
 */
const MESSAGE_KEY_BY_STATUS: Record<number, string> = {
  0: 'healthConnect.review.error.unreachable',
  400: 'healthConnect.review.error.invalid',
  401: 'healthConnect.review.error.signedOut',
  403: 'healthConnect.review.error.forbidden',
  404: 'healthConnect.review.error.notFound',
  409: 'healthConnect.review.error.conflict',
};

/**
 * The tail of the service's completeness refusal, from which requirement keys are read.
 *
 * <p>Anchored on the word before the colon rather than on the whole sentence, and deliberately not
 * on any requirement name: `Application has no linked profile` is also a 409 and also contains
 * `profile`, so matching bare key names would report a missing requirement that nobody is missing.
 */
const MISSING_REQUIREMENTS_TAIL = /missing[^:]*:([^"]*)/i;

/**
 * The Spring wrapper around a `ResponseStatusException` reason — `409 CONFLICT "…"`.
 *
 * <p>Unwrapped rather than shown as-is: the status is already rendered as a translated headline,
 * and repeating it in the service's own words tells the operator nothing they can act on.
 */
const PROBLEM_DETAIL_WRAPPER = /^\d{3}\s+[A-Z_]+\s+"([\s\S]*)"$/;

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

  /**
   * Why the last action was refused, or null (backlog.md item 46).
   *
   * <p>Until this existed the error arm of every transition on this page was `busy.set(false)` and
   * nothing else — no toast, no message, no field error. The spinner cleared and the card sat where
   * it was, which is indistinguishable from a button that does not work. It was reported from
   * production as exactly that: "activating a professional does not work, the card freezes".
   *
   * <p>The refusal that produced the report is by design — `OnboardingService` will not take an
   * application to ACTIVE unless the eight-requirement completion contract is met, and it names the
   * outstanding requirements in the 409. Those names were arriving in the browser and being thrown
   * away.
   */
  readonly actionError = signal<ReviewActionFailure | null>(null);

  /**
   * The client mirror of the server's `requireAllMandatoryDocumentsVerified`, and it has to read the
   * same list the server does (backlog.md item 20).
   *
   * <p>Archived rows are excluded. A document a reviewer rejected, the applicant replaced, and the
   * reviewer verified leaves the original REJECTED row in the list for ever — deliberately, since it
   * is credential history — and against the unfiltered list it would keep Approve greyed out with
   * nothing anyone could do about it. The server stopped refusing those applications; if this
   * computation had been left alone the browser would simply have refused them instead.
   */
  readonly allDocumentsVerified = computed(() => {
    const live = this.documents().filter(isLiveDocument);
    return live.length > 0 && live.every(d => d.verificationStatus === 'VERIFIED');
  });

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
    this.actionError.set(null);
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

  /**
   * Template access to {@link isLiveDocument}: an archived row is labelled, dimmed, and no longer
   * verifiable or rejectable — a verdict on a credential the applicant has already replaced would be
   * meaningless, and re-verifying it would not change what the server counts either way.
   */
  archived(document: OnboardingDocumentDto): boolean {
    return !isLiveDocument(document);
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
    this.actionError.set(null);
    this.gatewayAdmin.grantAuthority(application.login, application.requestedRole).subscribe({
      next: () => {
        this.api.markAuthorityAssigned(this.applicationId).subscribe({
          next: updated => {
            this.busy.set(false);
            this.alertService.showToast('healthConnect.review.toast.authorityAssigned');
            this.afterTransition(updated);
          },
          // Two error arms rather than one because the step is two calls, and either can refuse.
          // The second failing means the gateway granted the authority and the api never recorded
          // it, which is worth an operator seeing rather than a silent no-op.
          error: (error: unknown) => this.fail(error),
        });
      },
      error: (error: unknown) => this.fail(error),
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

  dismissActionError(): void {
    this.actionError.set(null);
  }

  /** The catalogue label for a requirement the service named, so the list reads in four languages. */
  requirementLabelKey(requirement: OnboardingRequirementKey): string {
    return 'healthConnect.profile.completion.requirements.' + requirement;
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
    this.actionError.set(null);
    request.subscribe({
      next: value => {
        this.busy.set(false);
        this.alertService.showToast(toastKey);
        onNext(value);
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  /**
   * The one place a refused action lands, for every transition on this page rather than for
   * activation alone — the hole was in `run`, so all seven had it, and fixing one would have left
   * six buttons that still do nothing visible when the service says no.
   */
  private fail(error: unknown): void {
    this.busy.set(false);
    this.actionError.set(this.failureFor(error));
  }

  private failureFor(error: unknown): ReviewActionFailure {
    const response = error instanceof HttpErrorResponse ? error : null;
    const detail = this.serverDetail(response);
    const missingRequirements = this.missingRequirements(detail);
    if (missingRequirements.length > 0) {
      return { messageKey: 'healthConnect.review.error.incompleteProfile', missingRequirements, detail: null };
    }
    return {
      messageKey: MESSAGE_KEY_BY_STATUS[response?.status ?? -1] ?? 'healthConnect.review.error.failed',
      missingRequirements: [],
      detail,
    };
  }

  /**
   * The sentence the service sent, unwrapped from the JHipster problem document and from Spring's
   * `409 CONFLICT "…"` framing, or null when the body carries none.
   */
  private serverDetail(response: HttpErrorResponse | null): string | null {
    const body: unknown = response?.error;
    const raw = typeof body === 'string' ? body : (body as { detail?: string; title?: string } | null)?.detail ?? null;
    const trimmed = raw?.trim();
    if (!trimmed) {
      return null;
    }
    return PROBLEM_DETAIL_WRAPPER.exec(trimmed)?.[1].trim() ?? trimmed;
  }

  /**
   * The requirement keys named after `missing:` in a completeness refusal, in catalogue order.
   *
   * <p>Intersected with {@link ONBOARDING_REQUIREMENT_KEYS} rather than taken as read, so a
   * sentence that lists something this build has no label for degrades to the generic headline and
   * the quoted detail instead of rendering a raw translation key at the operator.
   */
  private missingRequirements(detail: string | null): OnboardingRequirementKey[] {
    const tail = detail === null ? null : MISSING_REQUIREMENTS_TAIL.exec(detail)?.[1];
    if (!tail) {
      return [];
    }
    const named = new Set(tail.split(/[^A-Za-z]+/).filter(Boolean));
    return ONBOARDING_REQUIREMENT_KEYS.filter(requirement => named.has(requirement));
  }
}
