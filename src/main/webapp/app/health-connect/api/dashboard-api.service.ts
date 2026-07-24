import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { CaseDistributionSegmentDto, CaseTimelinePointDto, DashboardSummaryDto, PatientGroupSeriesDto } from './dashboard-api.model';

/**
 * Thin HttpClient wrapper for the dashboard endpoints specced in
 * application-migration.md Phase 1. Not wired into the app yet — see
 * ../http-health-connect.repository.ts and work/phase-1.md.
 */
@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/dashboard', 'patientService');

  summary(): Observable<DashboardSummaryDto> {
    return this.http.get<DashboardSummaryDto>(`${this.resourceUrl}/summary`);
  }

  caseTimeline(months = 6): Observable<CaseTimelinePointDto[]> {
    return this.http.get<CaseTimelinePointDto[]>(`${this.resourceUrl}/case-timeline`, { params: { months } });
  }

  caseDistribution(): Observable<CaseDistributionSegmentDto[]> {
    return this.http.get<CaseDistributionSegmentDto[]>(`${this.resourceUrl}/case-distribution`);
  }

  caseByPatientGroup(): Observable<PatientGroupSeriesDto[]> {
    return this.http.get<PatientGroupSeriesDto[]>(`${this.resourceUrl}/case-by-patient-group`);
  }
}
