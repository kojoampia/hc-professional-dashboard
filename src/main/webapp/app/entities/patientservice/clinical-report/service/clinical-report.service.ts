import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IClinicalReport, NewClinicalReport } from '../clinical-report.model';

export type PartialUpdateClinicalReport = Partial<IClinicalReport> & Pick<IClinicalReport, 'id'>;

type RestOf<T extends IClinicalReport | NewClinicalReport> = Omit<T, 'occurredAt'> & {
  occurredAt?: string | null;
};

export type RestClinicalReport = RestOf<IClinicalReport>;

export type NewRestClinicalReport = RestOf<NewClinicalReport>;

export type PartialUpdateRestClinicalReport = RestOf<PartialUpdateClinicalReport>;

@Injectable()
export class ClinicalReportsService {
  readonly clinicalReportsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly clinicalReportsResource = httpResource<RestClinicalReport[]>(() => {
    const params = this.clinicalReportsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of clinicalReport that have been fetched. It is updated when the clinicalReportsResource emits a new value.
   * In case of error while fetching the clinicalReports, the signal is set to an empty array.
   */
  readonly clinicalReports = computed(() =>
    (this.clinicalReportsResource.hasValue() ? this.clinicalReportsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/clinical-reports', 'patientservice');

  protected convertValueFromServer(restClinicalReport: RestClinicalReport): IClinicalReport {
    return {
      ...restClinicalReport,
      occurredAt: restClinicalReport.occurredAt ? dayjs(restClinicalReport.occurredAt) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ClinicalReportService extends ClinicalReportsService {
  protected readonly http = inject(HttpClient);

  create(clinicalReport: NewClinicalReport): Observable<IClinicalReport> {
    const copy = this.convertValueFromClient(clinicalReport);
    return this.http.post<RestClinicalReport>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(clinicalReport: IClinicalReport): Observable<IClinicalReport> {
    const copy = this.convertValueFromClient(clinicalReport);
    return this.http
      .put<RestClinicalReport>(`${this.resourceUrl}/${encodeURIComponent(this.getClinicalReportIdentifier(clinicalReport))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(clinicalReport: PartialUpdateClinicalReport): Observable<IClinicalReport> {
    const copy = this.convertValueFromClient(clinicalReport);
    return this.http
      .patch<RestClinicalReport>(`${this.resourceUrl}/${encodeURIComponent(this.getClinicalReportIdentifier(clinicalReport))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IClinicalReport> {
    return this.http
      .get<RestClinicalReport>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IClinicalReport[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestClinicalReport[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getClinicalReportIdentifier(clinicalReport: Pick<IClinicalReport, 'id'>): string {
    return clinicalReport.id;
  }

  compareClinicalReport(o1: Pick<IClinicalReport, 'id'> | null, o2: Pick<IClinicalReport, 'id'> | null): boolean {
    return o1 && o2 ? this.getClinicalReportIdentifier(o1) === this.getClinicalReportIdentifier(o2) : o1 === o2;
  }

  addClinicalReportToCollectionIfMissing<Type extends Pick<IClinicalReport, 'id'>>(
    clinicalReportCollection: Type[],
    ...clinicalReportsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const clinicalReports: Type[] = clinicalReportsToCheck.filter(isPresent);
    if (clinicalReports.length > 0) {
      const clinicalReportCollectionIdentifiers = clinicalReportCollection.map(clinicalReportItem =>
        this.getClinicalReportIdentifier(clinicalReportItem),
      );
      const clinicalReportsToAdd = clinicalReports.filter(clinicalReportItem => {
        const clinicalReportIdentifier = this.getClinicalReportIdentifier(clinicalReportItem);
        if (clinicalReportCollectionIdentifiers.includes(clinicalReportIdentifier)) {
          return false;
        }
        clinicalReportCollectionIdentifiers.push(clinicalReportIdentifier);
        return true;
      });
      return [...clinicalReportsToAdd, ...clinicalReportCollection];
    }
    return clinicalReportCollection;
  }

  protected convertValueFromClient<T extends IClinicalReport | NewClinicalReport | PartialUpdateClinicalReport>(
    clinicalReport: T,
  ): RestOf<T> {
    return {
      ...clinicalReport,
      occurredAt: clinicalReport.occurredAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestClinicalReport): IClinicalReport {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestClinicalReport[]): IClinicalReport[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
