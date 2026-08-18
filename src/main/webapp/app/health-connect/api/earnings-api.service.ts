import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { EarningsQuery, ProfessionalEarningsDto, ProfessionalShiftDto } from './earnings-api.model';

/**
 * The signed-in clinician's own roster and earnings, from adminservice.
 *
 * **There is no id in any of these URLs, and that is the design.** hc-admin also serves
 * `/api/professionals/{id}/earnings`, which is the administrator's view and stays admin-gated; the
 * `me` endpoints resolve the professional from the token instead, so there is no parameter here
 * that could be pointed at a colleague. Do not add one — a client-supplied id would be refused by
 * that service anyway, but the reason it would be refused is worth preserving in this file too.
 *
 * Wage rates are deliberately absent. They are the administrator's to set, this app only ever
 * reads what shifts came to, and there is no rate endpoint to call even if a screen wanted one.
 */
@Injectable({ providedIn: 'root' })
export class EarningsApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/professionals/me', 'adminservice');

  /** What the caller has earned over a window, with the bucketed series behind it. */
  ownEarnings(query: EarningsQuery = {}): Observable<ProfessionalEarningsDto> {
    return this.http.get<ProfessionalEarningsDto>(`${this.resourceUrl}/earnings`, { params: toParams(query) });
  }

  /**
   * The caller's own roster, oldest first — including off days and shifts still to come, each
   * flagged with whether it is payable.
   */
  ownShifts(query: Pick<EarningsQuery, 'from' | 'to'> = {}): Observable<ProfessionalShiftDto[]> {
    return this.http.get<ProfessionalShiftDto[]>(`${this.resourceUrl}/shifts`, { params: toParams(query) });
  }
}

/**
 * Only the parameters that were actually set. An empty `from=` is not the same request as no
 * `from` at all: the server reads a blank value as a parse failure rather than as "use the
 * default", so the window silently stops being the one the screen asked for.
 */
function toParams(query: EarningsQuery): HttpParams {
  let params = new HttpParams();
  if (query.granularity) {
    params = params.set('granularity', query.granularity);
  }
  if (query.from) {
    params = params.set('from', query.from);
  }
  if (query.to) {
    params = params.set('to', query.to);
  }
  return params;
}
