import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import {
  ActivityLogEntryDto,
  ClinicalReportDto,
  CreateActivityDto,
  CreateReportDto,
  PatientListItemDto,
  PatientRecordDto,
} from './patient-api.model';

export interface PatientQuery {
  query?: string;
  page?: number;
  size?: number;
  sort?: string[];
}

/**
 * Thin HttpClient wrapper for the Patient Directory / Record endpoints
 * specced in professional-web.md §5. Paginated the same way the
 * rest of this codebase's generated entity services are (req params via
 * createRequestOption, total count read off the X-Total-Count response
 * header) rather than a Spring Data Page envelope, for consistency with
 * med-case.service.ts and friends.
 *
 * Not wired into the app yet — see ../http-health-connect.repository.ts and
 * professional-web.md §5: no backend `Patient` resource exists in any microservice
 * as of this migration.
 */
@Injectable({ providedIn: 'root' })
export class PatientApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/patients', 'patientservice');

  query(request: PatientQuery = {}): Observable<HttpResponse<PatientListItemDto[]>> {
    const options = createRequestOption(request);
    return this.http.get<PatientListItemDto[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  find(id: string): Observable<PatientRecordDto> {
    return this.http.get<PatientRecordDto>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  appendActivity(patientId: string, activity: CreateActivityDto): Observable<ActivityLogEntryDto> {
    return this.http.post<ActivityLogEntryDto>(`${this.resourceUrl}/${encodeURIComponent(patientId)}/activities`, activity);
  }

  appendReport(patientId: string, report: CreateReportDto): Observable<ClinicalReportDto> {
    return this.http.post<ClinicalReportDto>(`${this.resourceUrl}/${encodeURIComponent(patientId)}/reports`, report);
  }
}
