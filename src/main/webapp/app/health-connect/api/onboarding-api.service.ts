import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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
}

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/onboarding', 'professionalservice');

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
    return this.http.get(`${this.resourceUrl}/documents/${encodeURIComponent(id)}/content`, { responseType: 'blob' });
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

  getOwnApplication(): Observable<OnboardingApplicationDto> {
    return this.http.get<OnboardingApplicationDto>(`${this.resourceUrl}/applications/me`);
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
    return this.http.get<OnboardingDocumentDto[]>(`${this.resourceUrl}/documents`);
  }

  uploadDocument(
    file: File,
    type: OnboardingDocumentType,
    options: { otherLabel?: string; expiryDate?: string } = {},
  ): Observable<OnboardingDocumentDto> {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    if (options.otherLabel) {
      form.append('otherLabel', options.otherLabel);
    }
    if (options.expiryDate) {
      form.append('expiryDate', options.expiryDate);
    }
    return this.http.post<OnboardingDocumentDto>(`${this.resourceUrl}/documents`, form);
  }
}
