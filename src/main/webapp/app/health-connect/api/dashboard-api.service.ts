import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { DashboardSummaryDto } from './dashboard-api.model';

/**
 * The dashboard figures professionalservice can answer on its own.
 *
 * **One method, where this once declared four.** `caseTimeline`, `caseDistribution` and
 * `caseByPatientGroup` were removed rather than repointed: all three are derived entirely from
 * clinical cases, patientservice owns those and already serves them to this app, and
 * `HttpHealthConnectRepository` holds the whole case collection in a signal anyway. Asking a second
 * service to re-aggregate data this app already has would make every chart depend on that service
 * being up, and would put professionalservice in the position of publishing clinical counts it
 * cannot verify. The charts are computed from the case cache instead — see the repository.
 *
 * `summary()` covers what only professionalservice knows: how many patients this clinician has
 * worked with, split by sex and by child/adult. Note it deliberately returns **no** case counts;
 * the repository fills `urgent`/`open`/`closed` from the cases it already loaded.
 */
@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/dashboard', 'professionalservice');

  summary(): Observable<DashboardSummaryDto> {
    return this.http.get<DashboardSummaryDto>(`${this.resourceUrl}/summary`);
  }
}
