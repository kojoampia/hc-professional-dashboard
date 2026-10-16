import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { PersonalDocumentType } from 'app/entities/personal-document/types.enum';
import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';

/**
 * The reviewer's onboarding API, plus the two surfaces still genuinely under `/api/onboarding` —
 * the acknowledgement and the progress meter (professional-onboarding-workflow.md WP4).
 *
 * <p>⚠ **It is no longer one surface, and since T6 it is no longer one client.** The `/api/onboarding`
 * base it was built against in WP3 now carries only `/progress` and `/acknowledgement`; the profile
 * moved to `api/profile` (F8), documents to `api/personal-document` (T2) and the application to
 * `api/professional-application` (T3). T6 split the **applicant's** reads and writes onto the thin
 * entities services `profile.md` names — `entities/profile/service.ts`,
 * `entities/personal-document/service.ts`, `entities/application/service.ts` — so what remains here
 * is the admin review surface (the queue, the decisions, the document verdicts), which stays on one
 * client deliberately, and the shared wire types both halves speak.
 */

export type OnboardingStatus =
  | 'APPLICATION_STARTED'
  | 'PROFILE_COMPLETED'
  | 'CREDENTIAL_REVIEW'
  | 'RETURNED_FOR_CORRECTION'
  | 'REJECTED'
  | 'APPROVED'
  | 'ORGANIZATION_ASSIGNED'
  | 'AUTHORITY_ASSIGNED'
  | 'ROSTER_CONFIGURED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'DEACTIVATED';

export type OnboardingDocumentType =
  | 'PASSPORT'
  | 'CERTIFICATE'
  | 'LICENSE'
  | 'GHANACARD'
  | 'PASSPHOTO'
  | 'DRIVERLICENSE'
  | 'VOTERCARD'
  | 'NHIS'
  | 'OTHER';

export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface OnboardingApplicationDto {
  id: string;
  accountId: string;
  login?: string | null;
  /** Set to `Profile.id` by the server; never sent by a client. */
  profileId?: string | null;
  /**
   * The clinical role being applied for — `requestedRole` until T3.
   *
   * <p>`profile.md` § Gap Update: *"Refactor the `String requestedRole` to `authority`"*, and
   * *"`Authority` is a class defined in the gateway. The `api` service holds only the role
   * string."* — so this is a `string` and not `UserAuthority`, deliberately, even though its values
   * are that enum's members. The `Authority` enum shape in `web` exists only to simplify the view
   * model.
   */
  authority?: string | null;
  status: OnboardingStatus;
  /** Whether consent was ticked (`profile.md` step 4). Rendered by the consent statement. */
  agreed?: boolean | null;
  /** When consent was given — a **server stamp**; `profile.md` renders it beside the statement. */
  agreedDate?: string | null;
  submittedAt?: string | null;
  decisionReason?: string | null;
  correctionNotes?: string | null;
  source?: string | null;
}

export interface OnboardingEventDto {
  id: string;
  applicationId: string;
  actor?: string | null;
  fromStatus?: OnboardingStatus | null;
  toStatus?: OnboardingStatus | null;
  reason?: string | null;
  at?: string | null;
}

/**
 * Server-computed onboarding completion (professional-onboarding-workflow.md § "Onboarding state
 * events and the completion contract").
 *
 * <p>Deliberately not derived in the browser: the same figure gates the transition to ACTIVE and
 * the post-sign-in redirect, and a client-side percentage can read 100% while the service still
 * refuses to advance the application. The client's job is to render this, not to reproduce it.
 */
export interface OnboardingProgressDto {
  percent: number;
  complete: boolean;
  /**
   * Where the application has got to, or null for an account with no application at all.
   *
   * <p>Not derivable from {@link complete}: ACTIVE requires completeness <em>and</em> admin vetting,
   * so a finished profile nobody has reviewed is `complete: true` with a status well short of
   * ACTIVE. Anything asking "is this clinician live" must read this.
   */
  status: OnboardingStatus | null;
  requirements: { key: OnboardingRequirementKey; done: boolean }[];
  /**
   * `profile.md`'s four onboarding steps, one boolean each — the coarse wire `backlog.md` row 230
   * decided on, added to this contract by unit A and consumed here by unit B.
   *
   * <p>Two readings of one state, and both ship: {@link requirements} is the fine-grained list,
   * `steps` is the coarse one the wizard's pane sequencing reads. The server derives three of the
   * four from the requirement answers rather than evaluating the predicates twice
   * (`OnboardingService.stepsFrom`), so the two cannot disagree about a predicate.
   *
   * <p>⚠ **`account` reads `false` for every seeded clinician and that is correct, not a bug.** It is
   * the one step this service cannot compute — its four fields (`firstName`, `lastName`, `langKey`,
   * `imageUrl`) live on `User` in the gateway — so it comes from a stored projection fed by Kafka
   * frames, and `false` also means "no frame has arrived yet". Three independent reasons make it
   * `false` today: no backfill for accounts not written since unit A shipped (row 233),
   * `InitialSetupMigration` bypassing the publish funnel and never setting `imageUrl` (row 233), and
   * `imageUrl` being writable by no surface in the estate until row 232 builds the avatar upload.
   * ⛔ **Do not build anything here that tries to "fix" it** — nothing gates on it, and the failure
   * direction is the safe one: it can read `false` when complete, never `true` when not.
   */
  steps: OnboardingSteps;
}

/**
 * `profile.md`'s four steps, which are also the wizard's four panes — `application` is step 4,
 * `profile` is step 2, `documents` is step 3 and `account` is step 1.
 *
 * <p>⚠ **The names are the server's, and the pane names are not the same words**: step 4 is called
 * `consent` on the wire and `application` in the UI. `WIRE_STEP_FOR_PANE` in
 * `app/onboarding/wizard.service.ts` is the one place that mapping is written down.
 */
export interface OnboardingSteps {
  account: boolean;
  profile: boolean;
  documents: boolean;
  consent: boolean;
}

/**
 * Requirement keys this build has a label for; each maps to a translated label in all four
 * catalogues under `healthConnect.profile.completion.requirements.*`.
 *
 * <p>A runtime array with the union derived from it, rather than a bare union, for the reason
 * `DUTY_ROSTER_SHIFTS` is one: a union cannot be enumerated at run time, so it cannot be matched
 * against anything. The review page needs exactly that — it reads the requirement names out of the
 * service's completeness refusal and has to know which tokens in that sentence are requirement keys
 * (backlog.md item 46).
 *
 * <p>✅ **It is now the nine keys the server sends, in display order — widened by `backlog.md` row
 * 230 unit B, 2026-10-10.** It held **seven** for as long as it existed, against a server that sent
 * eight and could name a ninth in a refusal:
 *
 * | | keys | state |
 * | --- | --- | --- |
 * | `OnboardingService.REQUIREMENT_KEYS` | **9** | the server's single vocabulary since unit A |
 * | this array, before unit B | 7 | no `photo`, no `authority` |
 * | all four i18n catalogues | **9** | `photo` has had a label throughout; unit A added `authority` |
 *
 * <p>⚠ **The comment here used to argue against widening it**, on the grounds that `authority` had no
 * label in four catalogues. That was true when it was written and stopped being true in unit A, which
 * added `…requirements.authority` to all four — so the stated blocker was already gone. Widening now
 * costs **no new translation**: `catalogues.spec.ts` and `translated-values.spec.ts` both pass
 * unchanged, which is the measurement rather than the inference.
 *
 * <p>⚠ **This array is INTERSECTED, not rendered, at its other caller** — read
 * `ReviewDetailPageComponent.missingRequirements` before touching it. It filters the keys named in a
 * refusal sentence against this list precisely so a token this build has no label for degrades to the
 * generic headline instead of rendering a raw translation key at an operator. So a *missing* member is
 * a silently absent chip, which is what the two were: a reviewer told "still missing" and not told
 * that the passport photo is the thing missing. Both now render.
 *
 * <p>A runtime array with the union derived from it, rather than a bare union, for the reason
 * `DUTY_ROSTER_SHIFTS` is one — see above.
 */
export const ONBOARDING_REQUIREMENT_KEYS = [
  'consent',
  'profile',
  'address',
  'nextOfKin',
  'certificate',
  'license',
  'identity',
  'photo',
  'authority',
] as const;

export type OnboardingRequirementKey = (typeof ONBOARDING_REQUIREMENT_KEYS)[number];

export interface OnboardingDocumentDto {
  id: string;
  name?: string | null;
  type: OnboardingDocumentType;
  otherLabel?: string | null;
  expiryDate?: string | null;
  sizeBytes?: number | null;
  verificationStatus?: DocumentVerificationStatus | null;
  rejectionReason?: string | null;
  /**
   * Set once a later upload of the same credential replaced this row; absent while it is the current
   * one (backlog.md item 20).
   *
   * <p>Renewing a credential archives the document it replaces rather than deleting it — a superseded
   * licence is evidence of what a clinician held while they were treating patients — so both document
   * lists in this app keep showing archived rows. They must not be counted, though:
   * `verificationStatus` is a reviewer's verdict and stays whatever it was, so an archived REJECTED
   * row would otherwise hold `allDocumentsVerified` false and grey out Approve for ever.
   */
  supersededAt?: string | null;
  /** The document that replaced this one — the history link the reviewer follows. */
  supersededByDocumentId?: string | null;
}

/** Whether a document is the credential the professional holds now, rather than an archived one. */
export function isLiveDocument(document: OnboardingDocumentDto): boolean {
  return !document.supersededAt;
}

/**
 * The avatar row `POST /api/personal-document/avatar` answers with — `backlog.md` row 232.
 *
 * <p>⛔ **`type` is `PersonalDocumentType`, the ten-value enum, and NOT `OnboardingDocumentType`.**
 * That is the one place the split between the two matters on a response: the nine-value union exists
 * so the credential upload cannot be handed an avatar at compile time, so it cannot describe the
 * avatar's own answer. Narrowed to the single member the handler can return, because this path stores
 * `AVATAR` and nothing else — a wider type here would invite a caller to branch on a value that
 * cannot arrive.
 *
 * <p>⚠ **`data` is absent, and that is the contract rather than an omission.** `api/` nulls the bytes
 * out of the create response — *"never echo the bytes back"* — so the only thing a client gets is the
 * id, which is what it needs: the path to the content endpoint is built from it.
 *
 * <p>⚠ **It does not appear in `GET /api/personal-document`.** The avatar is filtered out of the
 * own-document list and out of the reviewer's, and `allLiveDocumentsVerified` excludes the type
 * outright — without which a `PENDING` avatar would block approval for ever, since nothing in the
 * estate can verify one. So `OnboardingDocumentDto.type`'s nine-value union stays correct on the read
 * path, and the question its comment leaves open ("if it does appear, widen the union") is answered:
 * it does not.
 */
export interface AvatarDocumentDto {
  id: string;
  name?: string | null;
  type: PersonalDocumentType.AVATAR;
  sizeBytes?: number | null;
  verificationStatus?: DocumentVerificationStatus | null;
}

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/onboarding', 'professionalservice');

  /**
   * The reviewer's half of `api/personal-document` (profile.md step 3, T2/T3): the verdicts and the
   * loud content read. The applicant's half — the list, the uploads, the avatar — is
   * `entities/personal-document/service.ts`'s since T6.
   *
   * <p>⭐ **`verifyDocument` and `rejectDocument` use this base too since T3.** They stayed on
   * `/api/onboarding/documents/{id}/...` through T2; they are now `PersonalDocumentReviewResource`'s
   * on `/api/personal-document/{id}/...`, which is the base `profile.md` § Other Elements names for
   * the whole collection.
   */
  private readonly documentUrl = this.applicationConfigService.getEndpointFor('api/personal-document', 'professionalservice');

  /**
   * The reviewer's half of the professional application, which is no longer under `api/onboarding`
   * (profile.md step 4, T3): the queue, the `/{id}` reads and the lifecycle transitions. The
   * applicant's verbs — `start`, `saveConsent`, `completeProfile`, `submit`, the own-application
   * read — are `entities/application/service.ts`'s since T6.
   *
   * <p>`profile.md` § Other Elements: *"`api/onboarding/applications` should migrate to
   * `api/professional-application`"*. Leaving **any** call below on the old base would be a consumer
   * reading where nobody writes — silence that looks like health on the three shipped admin pages.
   * The sub-paths are unchanged under the new base, so that was one URL swap and not eleven
   * decisions.
   */
  private readonly applicationUrl = this.applicationConfigService.getEndpointFor('api/professional-application', 'professionalservice');

  acknowledgementStatus(): Observable<{ acknowledged: boolean }> {
    return this.http.get<{ acknowledged: boolean }>(`${this.resourceUrl}/acknowledgement`);
  }

  acknowledge(): Observable<unknown> {
    return this.http.post(`${this.resourceUrl}/acknowledgement`, null);
  }

  listApplications(status?: OnboardingStatus): Observable<OnboardingApplicationDto[]> {
    const params = status ? { params: { status } } : {};
    return this.http.get<OnboardingApplicationDto[]>(`${this.applicationUrl}`, params);
  }

  getApplication(id: string): Observable<OnboardingApplicationDto> {
    return this.http.get<OnboardingApplicationDto>(`${this.applicationUrl}/${encodeURIComponent(id)}`);
  }

  applicationDocuments(id: string): Observable<OnboardingDocumentDto[]> {
    return this.http.get<OnboardingDocumentDto[]>(`${this.applicationUrl}/${encodeURIComponent(id)}/documents`);
  }

  verifyDocument(id: string): Observable<OnboardingDocumentDto> {
    return this.http.put<OnboardingDocumentDto>(`${this.documentUrl}/${encodeURIComponent(id)}/verify`, null);
  }

  rejectDocument(id: string, reason: string): Observable<OnboardingDocumentDto> {
    return this.http.put<OnboardingDocumentDto>(`${this.documentUrl}/${encodeURIComponent(id)}/reject`, { reason });
  }

  /**
   * The document's bytes, as a blob a caller turns into an object URL — never a bare `<img src>`,
   * because this path is behind `assertOwnerOrReviewer` and needs the `Authorization` header.
   *
   * <p>The reviewer's read, and loud on purpose — there the bytes are the task, not a decoration.
   * The applicant's silent per-row preview read is `PersonalDocumentService.content`'s since T6; the
   * two call one endpoint deliberately, the same split `ProfileService` records for `api/profile`.
   * `silent` is kept for a reviewer surface that ever grows a placeholder of its own.
   */
  documentContent(id: string, options: { silent?: boolean } = {}): Observable<Blob> {
    return this.http.get(`${this.documentUrl}/${encodeURIComponent(id)}/content`, {
      responseType: 'blob',
      context: new HttpContext().set(SKIP_ERROR_ALERT, options.silent === true),
    });
  }

  decide(id: string, decision: OnboardingStatus, reason?: string, correctionNotes?: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.applicationUrl}/${encodeURIComponent(id)}/decide`, {
      decision,
      reason: reason ?? null,
      correctionNotes: correctionNotes ?? null,
    });
  }

  assignOrganization(
    id: string,
    payload: { specialtyCategoryId?: string | null; teamIds?: string[]; supervisorProfileId?: string | null },
  ): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.applicationUrl}/${encodeURIComponent(id)}/organization`, payload);
  }

  markAuthorityAssigned(id: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.applicationUrl}/${encodeURIComponent(id)}/authority-assigned`, null);
  }

  markRosterConfigured(id: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.applicationUrl}/${encodeURIComponent(id)}/roster-configured`, null);
  }

  activate(id: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.applicationUrl}/${encodeURIComponent(id)}/activate`, null);
  }

  suspend(id: string, reason: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.applicationUrl}/${encodeURIComponent(id)}/suspend`, { reason });
  }

  deactivate(id: string, reason: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.applicationUrl}/${encodeURIComponent(id)}/deactivate`, { reason });
  }

  events(applicationId: string): Observable<OnboardingEventDto[]> {
    return this.http.get<OnboardingEventDto[]>(`${this.applicationUrl}/${encodeURIComponent(applicationId)}/events`);
  }

  /**
   * Always answers, including for an account that has no application yet, so it needs no opt-out
   * from the error banner the way the 404-prone own-application and own-profile reads on the
   * entities services do.
   */
  progress(): Observable<OnboardingProgressDto> {
    return this.http.get<OnboardingProgressDto>(`${this.resourceUrl}/progress`);
  }
}
