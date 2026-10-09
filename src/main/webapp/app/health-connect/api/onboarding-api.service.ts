import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { PersonalDocumentType } from 'app/entities/personal-document/types.enum';
import { Sex } from 'app/entities/profile/sex.enum';
import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';

/**
 * Applicant-facing onboarding API (professional-onboarding-workflow.md WP4).
 *
 * <p>⚠ **It is no longer one surface.** The `/api/onboarding` base it was built against in WP3 now
 * carries only `/progress` and `/acknowledgement`; the profile moved to `api/profile` (F8),
 * documents to `api/personal-document` (T2) and the application to `api/professional-application`
 * (T3), each a base of its own below. Splitting this file follows in T6.
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
 * The document types that count as proof of identity, as opposed to a credential.
 *
 * <p>Lives here rather than beside either screen that uses it: the onboarding wizard collects the
 * card and the profile page edits it afterwards, and a list that disagreed between the two would
 * let a clinician pick a type the wizard would not have accepted.
 *
 * <p>⚠ **Typed `PersonalDocumentType[]` rather than `OnboardingDocumentType[]` since F9.** The two
 * hold the same nine names, but `profile.md` types `Profile.cardType` by `types.enum.ts` and a TS
 * string enum is **nominal** — a bare `'GHANACARD'` literal is not assignable to it — so this list,
 * which is what the card dropdown iterates, has to be members rather than literals or the dropdown
 * cannot produce a value the wire type accepts. `OnboardingDocumentType` stays as it is for
 * `PersonalDocument.type`, which is T2's and T3's.
 */
export const IDENTITY_TYPES: PersonalDocumentType[] = [
  PersonalDocumentType.PASSPORT,
  PersonalDocumentType.GHANACARD,
  PersonalDocumentType.DRIVERLICENSE,
  PersonalDocumentType.VOTERCARD,
];

export interface OnboardingAddressDto {
  digitalAddress?: string | null;
  streetAddress?: string | null;
  town?: string | null;
  city?: string | null;
  district?: string | null;
  region?: string | null;
  country?: string | null;
}

export interface OnboardingEmergencyContactDto {
  name?: string | null;
  relationship?: string | null;
  phone?: string | null;
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
}

/**
 * Keys the server sends, in display order; each maps to a translated label in all four catalogues
 * under `healthConnect.profile.completion.requirements.*`.
 *
 * <p>A runtime array with the union derived from it, rather than a bare union, for the reason
 * `DUTY_ROSTER_SHIFTS` is one: a union cannot be enumerated at run time, so it cannot be matched
 * against anything. The review page needs exactly that — it reads the requirement names out of the
 * service's completeness refusal and has to know which tokens in that sentence are requirement keys
 * (backlog.md item 46).
 */
export const ONBOARDING_REQUIREMENT_KEYS = ['consent', 'profile', 'address', 'nextOfKin', 'certificate', 'license', 'identity'] as const;

export type OnboardingRequirementKey = (typeof ONBOARDING_REQUIREMENT_KEYS)[number];

export interface OnboardingProfileDto {
  id?: string | null;
  accountId?: string | null;
  firstName?: string | null;
  middleNames?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  /**
   * One of `Sex`'s two members, typed since F9.
   *
   * <p>`profile.md`'s Profile model types this field `enum` and names the file it specifies for it,
   * `app/entities/profile/sex.enum.ts`. It was `string | null`, so `{"sex":"banana"}` type-checked
   * here and stored on the server.
   */
  sex?: Sex | null;
  mobilePhone?: string | null;
  email?: string | null;
  title?: string | null;
  /**
   * Which identity document `cardNumber` is the number of — typed since F9.
   *
   * <p>`profile.md` names the vocabulary explicitly: *"PersonalDocumentType: `types.enum.ts`"*. That
   * is the same nine members a `PersonalDocument.type` carries, which is the point — a card type and
   * a document type are one vocabulary and were two, one of them free text.
   */
  cardType?: PersonalDocumentType | null;
  cardNumber?: string | null;
  address?: OnboardingAddressDto | null;
  emergencyContact?: OnboardingEmergencyContactDto | null;
}

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

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/onboarding', 'professionalservice');

  /**
   * The applicant's own documents, which are no longer under `api/onboarding` (profile.md step 3, T2).
   *
   * <p>A second base rather than a second service, deliberately: splitting this file is T6's work and
   * it carries seven exports besides the service, so doing it here would widen a task that only has
   * to move three calls. ⚠ What must NOT happen is these calls staying on `api/onboarding/documents`
   * — the server mappings are gone, so that would be a consumer reading where nobody writes, which is
   * silence that looks like health.
   *
   * <p>⭐ **`verifyDocument` and `rejectDocument` use this base too since T3.** They are the
   * reviewer's half and stayed on `/api/onboarding/documents/{id}/...` through T2; they are now
   * `PersonalDocumentReviewResource`'s on `/api/personal-document/{id}/...`, which is the base
   * `profile.md` § Other Elements names for the whole collection.
   */
  private readonly documentUrl = this.applicationConfigService.getEndpointFor('api/personal-document', 'professionalservice');

  /**
   * The professional application, which is no longer under `api/onboarding` (profile.md step 4, T3).
   *
   * <p>`profile.md` § Other Elements: *"`api/onboarding/applications` should migrate to
   * `api/professional-application`"*. All fifteen server mappings moved, so leaving these eleven
   * calls on the old base would be a consumer reading where nobody writes — silence that looks like
   * health on the three shipped admin pages, and a dead Submit button for every applicant.
   *
   * <p>The sub-paths are unchanged under the new base — `/me`, `/me/submit`, `/{id}/decide` — so
   * this is one URL swap and not eleven decisions.
   *
   * <p>A fourth base rather than a fourth service, for the reason `documentUrl` above gives:
   * splitting this file is T6's work and it carries seven exports besides the service.
   */
  private readonly applicationUrl = this.applicationConfigService.getEndpointFor('api/professional-application', 'professionalservice');

  /**
   * The clinician's own profile, which is no longer under `api/onboarding` (profile.md step 2, F8).
   *
   * <p>`profile.md` § Other Elements: *"`api/onboarding/profile` should migrate to `api/profile`"*.
   * The server mappings are **gone**, so leaving these two calls on the old base would be a consumer
   * reading and writing where nobody serves — silence that looks like health, which on the write half
   * means a pane answering 404 where it used to answer 200.
   *
   * <p>⚠ **The semantics changed with the path and that is the point of the migration.**
   * `PUT /api/onboarding/profile` was a thirteen-field whole-document replace with no null guards;
   * `PUT /api/profile` applies only the fields the body names. {@link ClinicalProfileComponent} still
   * spreads `{...this.loaded, …}` and no longer has to — see the note there — but a pane that posts a
   * subset is now safe, which it was not.
   *
   * <p>A third base rather than a third service, for the reason `documentUrl` above gives: splitting
   * this file is T6's work and it carries seven exports besides the service.
   */
  private readonly profileUrl = this.applicationConfigService.getEndpointFor('api/profile', 'professionalservice');

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

  documentContent(id: string): Observable<Blob> {
    return this.http.get(`${this.documentUrl}/${encodeURIComponent(id)}/content`, { responseType: 'blob' });
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

  /**
   * Starts the caller's application, recording step 4's consent and requested authority.
   *
   * <p>⚠ **The body is `profile.md` step 4's and was `{ requestedRole, consentAccepted }` until
   * T3.** `agreed` and `authority` are the field names the specification gives, and the server's
   * record binds exactly those three components — a stale name is simply not heard, so a renamed
   * field left behind here would have stored `authority: null` and answered 201 doing it.
   *
   * <p>`agreed: true` is hard-coded because the caller only reaches this method from a ticked
   * consent box; the server refuses `false` with a 400 either way, which is the half that matters.
   */
  startApplication(authority: string, source?: string | null): Observable<OnboardingApplicationDto> {
    return this.http.post<OnboardingApplicationDto>(`${this.applicationUrl}`, {
      agreed: true,
      authority,
      source: source ?? null,
    });
  }

  /**
   * Step 4's **Save**: stores the consent and the requested authority and moves the application to
   * `CREDENTIAL_REVIEW`.
   *
   * <p>`profile.md` step 4 gives Save and Submit identical server effects, so this and
   * {@link submit} call one service method — the difference between the two buttons is the wizard's
   * (T8), not the server's. ⚠ **A second call answers 409** from the onboarding state machine:
   * `PROFILE_COMPLETED → CREDENTIAL_REVIEW` is the only legal move out, and the client does not get
   * to decide transition legality.
   */
  saveConsent(authority: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.applicationUrl}/me`, { agreed: true, authority });
  }

  /**
   * 404 means "no application", which is the normal state for every clinician seeded or invited
   * rather than hired through the careers page — both callers already handle it, the wizard by
   * opening at the consent step and the first-login interstitial by a `catchError`. Opted out of
   * the global error banner because it is polled from the shell on every navigation, so the
   * untreated version put a red "Not found" over every page in the portal.
   */
  getOwnApplication(): Observable<OnboardingApplicationDto> {
    return this.http.get<OnboardingApplicationDto>(`${this.applicationUrl}/me`, {
      context: new HttpContext().set(SKIP_ERROR_ALERT, true),
    });
  }

  completeProfile(): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.applicationUrl}/me/complete-profile`, null);
  }

  /**
   * Step 4's **Submit** — the same server operation as {@link saveConsent}, under the path the old
   * `/applications/me/submit` mapping migrated to.
   *
   * <p>⚠ **It carries a body since T3 and sent `null` before.** Step 4 has Submit store the consent
   * and the requested authority as well as advancing the status, so the authority is a parameter
   * rather than something the server reads off the row it already has.
   */
  submit(authority: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.applicationUrl}/me/submit`, { agreed: true, authority });
  }

  events(applicationId: string): Observable<OnboardingEventDto[]> {
    return this.http.get<OnboardingEventDto[]>(`${this.applicationUrl}/${encodeURIComponent(applicationId)}/events`);
  }

  /**
   * Always answers, including for an account that has no application yet, so it needs no opt-out
   * from the error banner the way the 404-prone lookups below do.
   */
  progress(): Observable<OnboardingProgressDto> {
    return this.http.get<OnboardingProgressDto>(`${this.resourceUrl}/progress`);
  }

  /**
   * A 404 here means "no profile yet", which both callers handle — the wizard leaves its form
   * blank and the profile page shows an empty one. Opted out of the global error banner so that
   * ordinary outcome stops rendering as "Not found" over a page that is working.
   */
  getOwnProfile(): Observable<OnboardingProfileDto> {
    return this.http.get<OnboardingProfileDto>(this.profileUrl, {
      context: new HttpContext().set(SKIP_ERROR_ALERT, true),
    });
  }

  upsertProfile(profile: OnboardingProfileDto): Observable<OnboardingProfileDto> {
    return this.http.put<OnboardingProfileDto>(this.profileUrl, profile);
  }

  listDocuments(): Observable<OnboardingDocumentDto[]> {
    return this.http.get<OnboardingDocumentDto[]>(this.documentUrl);
  }

  /**
   * Uploads a credential.
   *
   * <p>`supersedesDocumentId` names one of the caller's own live documents that this one replaces,
   * and it is the only thing that archives a row (backlog.md item 20). The server does not infer the
   * replacement, because it cannot: a renewed certificate and a second, different certificate are the
   * same request. Sending nothing simply adds a document.
   *
   * <p>⚠ **A JSON body with `data` base64-encoded, which is `profile.md`'s specified
   * `PersonalDocument` shape** (step 3, T2). This sent `multipart/form-data` until then. Two things
   * follow and neither is cosmetic. The file has to be read in the browser before the request can be
   * built, so this returns a promise-backed observable rather than firing immediately — a 5 MB scan
   * takes a moment to read and the caller must not treat "the observable exists" as "the upload
   * started". And base64 is 4/3 of the file, so a 5 MB document — the server's own ceiling — becomes
   * roughly 6.7 MB of request, against nginx's 8 MB cap: the headroom is real but much smaller than
   * it was, and anything past ~6 MB of document is refused by nginx with a bare 413 rather than by
   * the service with a message.
   */
  uploadDocument(
    file: File,
    type: OnboardingDocumentType,
    options: { otherLabel?: string; expiryDate?: string; supersedesDocumentId?: string } = {},
  ): Observable<OnboardingDocumentDto> {
    return from(base64Of(file)).pipe(
      switchMap(data =>
        this.http.post<OnboardingDocumentDto>(this.documentUrl, {
          name: file.name,
          type,
          data,
          dataContentType: file.type,
          otherLabel: options.otherLabel ?? null,
          expiryDate: options.expiryDate ?? null,
          supersedesDocumentId: options.supersedesDocumentId ?? null,
        }),
      ),
    );
  }
}

/**
 * The file's bytes as base64, without the `data:` prefix a data URL carries.
 *
 * <p>`FileReader.readAsDataURL` rather than `file.arrayBuffer()` plus `btoa`: the latter needs a
 * binary string built one character at a time, which blows the call stack on a multi-megabyte file
 * when written the obvious way (`String.fromCharCode(...bytes)`). The reader does the encoding
 * natively and in one pass.
 */
function base64Of(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    // `reader.error` is a DOMException and is what a caller wants; the fallback is only for the
    // case the File API allows but does not describe, and it is deliberately NOT a sentence — this
    // never reaches a screen, and `untranslated-literals.spec.ts` rightly cannot tell a thrown
    // message from a caption. `NotReadableError` is the File API's own name for this failure.
    reader.onerror = () => reject(reader.error ?? new DOMException('', 'NotReadableError'));
    reader.onload = () => {
      const result = reader.result as string;
      // `data:<mime>;base64,<payload>` — everything after the comma is the payload, and the comma
      // cannot appear in base64 itself.
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}
