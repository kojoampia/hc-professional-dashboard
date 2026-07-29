import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { OnboardingEventDto } from './onboarding-api.service';

export interface SweepResultDto {
  expiredLicenses: number;
  applicationsSuspended: number;
}

export interface ExpiringLicenseDto {
  documentId: string;
  profileId: string;
  applicationId: string | null;
  accountId: string | null;
  login: string | null;
  expiryDate: string;
  verificationStatus: string | null;
}

export interface OnboardingMetricsDto {
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  expiringLicenses30d: number;
}

/**
 * WP7 admin compliance/operations client for `/api/onboarding/compliance`:
 * funnel metrics (careers task 145), the expiring-license watchlist, the
 * on-demand expiry sweep, and the cross-application audit feed.
 */
@Injectable({ providedIn: 'root' })
export class ComplianceApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/onboarding/compliance', 'professionalService');

  metrics(): Observable<OnboardingMetricsDto> {
    return this.http.get<OnboardingMetricsDto>(`${this.resourceUrl}/metrics`);
  }

  expiring(days = 30): Observable<ExpiringLicenseDto[]> {
    return this.http.get<ExpiringLicenseDto[]>(`${this.resourceUrl}/expiring`, { params: new HttpParams().set('days', days) });
  }

  sweep(): Observable<SweepResultDto> {
    return this.http.post<SweepResultDto>(`${this.resourceUrl}/sweep`, null);
  }

  recentEvents(): Observable<OnboardingEventDto[]> {
    return this.http.get<OnboardingEventDto[]>(`${this.resourceUrl}/events`);
  }
}
