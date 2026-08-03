import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IReport, NewReport } from '../report.model';

export type PartialUpdateReport = Partial<IReport> & Pick<IReport, 'id'>;

type RestOf<T extends IReport | NewReport> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestReport = RestOf<IReport>;

export type NewRestReport = RestOf<NewReport>;

export type PartialUpdateRestReport = RestOf<PartialUpdateReport>;

@Injectable()
export class ReportsService {
  readonly reportsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly reportsResource = httpResource<RestReport[]>(() => {
    const params = this.reportsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of report that have been fetched. It is updated when the reportsResource emits a new value.
   * In case of error while fetching the reports, the signal is set to an empty array.
   */
  readonly reports = computed(() =>
    (this.reportsResource.hasValue() ? this.reportsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/reports', 'professionalservice');

  protected convertValueFromServer(restReport: RestReport): IReport {
    return {
      ...restReport,
      createdDate: restReport.createdDate ? dayjs(restReport.createdDate) : undefined,
      modifiedDate: restReport.modifiedDate ? dayjs(restReport.modifiedDate) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ReportService extends ReportsService {
  protected readonly http = inject(HttpClient);

  create(report: NewReport): Observable<IReport> {
    const copy = this.convertValueFromClient(report);
    return this.http.post<RestReport>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(report: IReport): Observable<IReport> {
    const copy = this.convertValueFromClient(report);
    return this.http
      .put<RestReport>(`${this.resourceUrl}/${encodeURIComponent(this.getReportIdentifier(report))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(report: PartialUpdateReport): Observable<IReport> {
    const copy = this.convertValueFromClient(report);
    return this.http
      .patch<RestReport>(`${this.resourceUrl}/${encodeURIComponent(this.getReportIdentifier(report))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IReport> {
    return this.http.get<RestReport>(`${this.resourceUrl}/${encodeURIComponent(id)}`).pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IReport[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestReport[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getReportIdentifier(report: Pick<IReport, 'id'>): string {
    return report.id;
  }

  compareReport(o1: Pick<IReport, 'id'> | null, o2: Pick<IReport, 'id'> | null): boolean {
    return o1 && o2 ? this.getReportIdentifier(o1) === this.getReportIdentifier(o2) : o1 === o2;
  }

  addReportToCollectionIfMissing<Type extends Pick<IReport, 'id'>>(
    reportCollection: Type[],
    ...reportsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const reports: Type[] = reportsToCheck.filter(isPresent);
    if (reports.length > 0) {
      const reportCollectionIdentifiers = reportCollection.map(reportItem => this.getReportIdentifier(reportItem));
      const reportsToAdd = reports.filter(reportItem => {
        const reportIdentifier = this.getReportIdentifier(reportItem);
        if (reportCollectionIdentifiers.includes(reportIdentifier)) {
          return false;
        }
        reportCollectionIdentifiers.push(reportIdentifier);
        return true;
      });
      return [...reportsToAdd, ...reportCollection];
    }
    return reportCollection;
  }

  protected convertValueFromClient<T extends IReport | NewReport | PartialUpdateReport>(report: T): RestOf<T> {
    return {
      ...report,
      createdDate: report.createdDate?.format(DATE_FORMAT) ?? null,
      modifiedDate: report.modifiedDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestReport): IReport {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestReport[]): IReport[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
