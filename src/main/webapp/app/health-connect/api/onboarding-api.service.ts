import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';

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
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/onboarding', 'professionalService');

  startApplication(requestedRole: string): Observable<OnboardingApplicationDto> {
    return this.http.post<OnboardingApplicationDto>(`${this.resourceUrl}/applications`, { requestedRole, consentAccepted: true });
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

  getOwnProfile(): Observable<OnboardingProfileDto> {
    return this.http.get<OnboardingProfileDto>(`${this.resourceUrl}/profile`);
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
