import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { DutyRosterDto } from './duty-roster-api.model';

/**
 * Thin HttpClient wrapper for the Duty Roster endpoints specced in
 * application-migration.md Phase 1. Not wired into the app yet — see
 * ../http-health-connect.repository.ts and work/phase-1.md.
 */
@Injectable({ providedIn: 'root' })
export class DutyRosterApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/duty-rosters', 'professionalService');

  list(): Observable<DutyRosterDto[]> {
    return this.http.get<DutyRosterDto[]>(this.resourceUrl);
  }

  subscribe(rosterId: string): Observable<void> {
    return this.http.post<void>(`${this.resourceUrl}/${encodeURIComponent(rosterId)}/subscription`, {});
  }

  unsubscribe(rosterId: string): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${encodeURIComponent(rosterId)}/subscription`);
  }
}
