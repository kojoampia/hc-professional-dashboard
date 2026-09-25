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
   * One case by id — and this exists because {@link query} silently truncates.
   *
   * <p><b>backlog.md item 203.</b> `query()` sends no `page` and no `size`, and the server answers
   * with its own default. Measured on quality 2026-09-25: <b>20 rows of 1167</b>,
   * `X-Total-Count: 1167`, `Link` naming `size=20` and a last page of 58. The case detail page used
   * to resolve an id inside that collection, so <b>97 of the signed-in clinician's own 105 cases</b>
   * were reported as "not found" — real cases, assigned to them, on the deployed stack.
   *
   * <p>This read cannot truncate. The sibling answers <b>200</b> for a case that exists and
   * <b>404</b> for one that does not — both verified against the running patientservice the same day
   * — so absence becomes the server's answer rather than an inference from a collection nobody
   * bounded.
   *
   * <p>⛔ <b>This does not make `query()` safe.</b> The queue, the charts and every other collection
   * consumer still read 20 rows and still treat them as the collection. Narrowing the fix to the
   * detail page was item 203's decision; the collection's ceiling is still open.
   */
  find(id: string): Observable<HttpResponse<ClinicalCaseDto>> {
    return this.http
      .get<RestClinicalCaseDto>(`${this.resourceUrl}/${encodeURIComponent(id)}`, { observe: 'response' })
      .pipe(map(response => response.clone({ body: response.body ? fromRest(response.body) : null })));
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
