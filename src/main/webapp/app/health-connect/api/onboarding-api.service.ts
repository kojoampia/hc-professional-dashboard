import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';

/**
 * Applicant-facing onboarding API (professional-onboarding-workflow.md WP4)
 * against the professionalService `/api/onboarding` surface built in WP3.
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
  profileId?: string | null;
  requestedRole?: string | null;
  status: OnboardingStatus;
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
 */
export const IDENTITY_TYPES: OnboardingDocumentType[] = ['PASSPORT', 'GHANACARD', 'DRIVERLICENSE', 'VOTERCARD'];

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
  sex?: string | null;
  mobilePhone?: string | null;
  email?: string | null;
  title?: string | null;
  cardType?: string | null;
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
   * <p>⛔ `verifyDocument` and `rejectDocument` below deliberately stay on `resourceUrl`. They are the
   * reviewer's half, they are still served from `/api/onboarding/documents/{id}/...`, and they migrate
   * with the rest of the admin surface in T3.
   */
  private readonly documentUrl = this.applicationConfigService.getEndpointFor('api/personal-document', 'professionalservice');

  acknowledgementStatus(): Observable<{ acknowledged: boolean }> {
    return this.http.get<{ acknowledged: boolean }>(`${this.resourceUrl}/acknowledgement`);
  }

  acknowledge(): Observable<unknown> {
    return this.http.post(`${this.resourceUrl}/acknowledgement`, null);
  }

  listApplications(status?: OnboardingStatus): Observable<OnboardingApplicationDto[]> {
    const params = status ? { params: { status } } : {};
    return this.http.get<OnboardingApplicationDto[]>(`${this.resourceUrl}/applications`, params);
  }

  getApplication(id: string): Observable<OnboardingApplicationDto> {
    return this.http.get<OnboardingApplicationDto>(`${this.resourceUrl}/applications/${encodeURIComponent(id)}`);
  }

  applicationDocuments(id: string): Observable<OnboardingDocumentDto[]> {
    return this.http.get<OnboardingDocumentDto[]>(`${this.resourceUrl}/applications/${encodeURIComponent(id)}/documents`);
  }

  verifyDocument(id: string): Observable<OnboardingDocumentDto> {
    return this.http.put<OnboardingDocumentDto>(`${this.resourceUrl}/documents/${encodeURIComponent(id)}/verify`, null);
  }

  rejectDocument(id: string, reason: string): Observable<OnboardingDocumentDto> {
    return this.http.put<OnboardingDocumentDto>(`${this.resourceUrl}/documents/${encodeURIComponent(id)}/reject`, { reason });
  }

  documentContent(id: string): Observable<Blob> {
    return this.http.get(`${this.documentUrl}/${encodeURIComponent(id)}/content`, { responseType: 'blob' });
  }

  decide(id: string, decision: OnboardingStatus, reason?: string, correctionNotes?: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.resourceUrl}/applications/${encodeURIComponent(id)}/decide`, {
      decision,
      reason: reason ?? null,
      correctionNotes: correctionNotes ?? null,
    });
  }

  assignOrganization(
    id: string,
    payload: { specialtyCategoryId?: string | null; teamIds?: string[]; supervisorProfileId?: string | null },
  ): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.resourceUrl}/applications/${encodeURIComponent(id)}/organization`, payload);
  }

  markAuthorityAssigned(id: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.resourceUrl}/applications/${encodeURIComponent(id)}/authority-assigned`, null);
  }

  markRosterConfigured(id: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.resourceUrl}/applications/${encodeURIComponent(id)}/roster-configured`, null);
  }

  activate(id: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.resourceUrl}/applications/${encodeURIComponent(id)}/activate`, null);
  }

  suspend(id: string, reason: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.resourceUrl}/applications/${encodeURIComponent(id)}/suspend`, { reason });
  }

  deactivate(id: string, reason: string): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.resourceUrl}/applications/${encodeURIComponent(id)}/deactivate`, { reason });
  }

  startApplication(requestedRole: string, source?: string | null): Observable<OnboardingApplicationDto> {
    return this.http.post<OnboardingApplicationDto>(`${this.resourceUrl}/applications`, {
      requestedRole,
      consentAccepted: true,
      source: source ?? null,
    });
  }

  /**
   * 404 means "no application", which is the normal state for every clinician seeded or invited
   * rather than hired through the careers page — both callers already handle it, the wizard by
   * opening at the consent step and the first-login interstitial by a `catchError`. Opted out of
   * the global error banner because it is polled from the shell on every navigation, so the
   * untreated version put a red "Not found" over every page in the portal.
   */
  getOwnApplication(): Observable<OnboardingApplicationDto> {
    return this.http.get<OnboardingApplicationDto>(`${this.resourceUrl}/applications/me`, {
      context: new HttpContext().set(SKIP_ERROR_ALERT, true),
    });
  }

  completeProfile(): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.resourceUrl}/applications/me/complete-profile`, null);
  }

  submit(): Observable<OnboardingApplicationDto> {
    return this.http.put<OnboardingApplicationDto>(`${this.resourceUrl}/applications/me/submit`, null);
  }

  events(applicationId: string): Observable<OnboardingEventDto[]> {
    return this.http.get<OnboardingEventDto[]>(`${this.resourceUrl}/applications/${encodeURIComponent(applicationId)}/events`);
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
    return this.http.get<OnboardingProfileDto>(`${this.resourceUrl}/profile`, {
      context: new HttpContext().set(SKIP_ERROR_ALERT, true),
    });
  }

  upsertProfile(profile: OnboardingProfileDto): Observable<OnboardingProfileDto> {
    return this.http.put<OnboardingProfileDto>(`${this.resourceUrl}/profile`, profile);
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
