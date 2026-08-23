import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { ClinicalCaseDto, PartialUpdateClinicalCaseDto, RestClinicalCaseDto } from './clinical-case-api.model';

/**
 * Clinical cases, from the sibling `hc-patient` stack.
 *
 * <p>Replaces the generated `ClinicalCaseService` that lived under
 * `entities/patientservice/clinical-case/` before the generated entity layer was removed. That class
 * carried the full JHipster CRUD surface — create, update, find, delete, `httpResource` signals,
 * `addToCollectionIfMissing`, comparators — of which this application ever called two methods. Only
 * those two are here; add a third when something needs it rather than restoring the rest.
 *
 * <p>The URL goes through {@link ApplicationConfigService#getEndpointFor} with the
 * `'patientservice'` microservice argument, never a hardcoded path, so it resolves to
 * `/services/patientservice/api/clinical-cases` and the gateway routes it across the stacks.
 */
@Injectable({ providedIn: 'root' })
export class ClinicalCaseApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/clinical-cases', 'patientservice');

  query(): Observable<HttpResponse<ClinicalCaseDto[]>> {
    return this.http
      .get<RestClinicalCaseDto[]>(this.resourceUrl, { observe: 'response' })
      .pipe(map(response => response.clone({ body: (response.body ?? []).map(item => fromRest(item)) })));
  }

  /**
   * Retires a case from the queue.
   *
   * <p>A POST to a transition endpoint rather than a PATCH setting a field, and that is the api's
   * design rather than this client's preference: a PATCH over `archivedAt` would let a client choose
   * when a case was archived and by whom, and both are records rather than claims. The server stamps
   * the caller and the time; this sends only the reason.</p>
   *
   * <p>The reason is required. An archive without one is the delete that patient data does not
   * allow, wearing a different name — which is why it is collected from the user rather than
   * defaulted here.</p>
   */
  archive(id: string, reason: string): Observable<ClinicalCaseDto> {
    return this.http
      .post<RestClinicalCaseDto>(`${this.resourceUrl}/${encodeURIComponent(id)}/archive`, { reason })
      .pipe(map(response => fromRest(response)));
  }

  partialUpdate(clinicalCase: PartialUpdateClinicalCaseDto): Observable<ClinicalCaseDto> {
    const body: RestClinicalCaseDto = { ...clinicalCase, openedAt: clinicalCase.openedAt?.toJSON() ?? null };
    return this.http
      .patch<RestClinicalCaseDto>(`${this.resourceUrl}/${encodeURIComponent(clinicalCase.id)}`, body)
      .pipe(map(response => fromRest(response)));
  }
}

/** `openedAt` is an ISO string on the wire; everything downstream expects dayjs. */
const fromRest = (clinicalCase: RestClinicalCaseDto): ClinicalCaseDto => ({
  ...clinicalCase,
  openedAt: clinicalCase.openedAt ? dayjs(clinicalCase.openedAt) : undefined,
});
