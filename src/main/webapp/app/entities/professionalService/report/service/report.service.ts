import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, asapScheduler, scheduled } from 'rxjs';

import { catchError, map } from 'rxjs/operators';

import dayjs from 'dayjs/esm';

import { isPresent } from 'app/core/util/operators';
import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { Search } from 'app/core/request/request.model';
import { IReport, NewReport } from '../report.model';

export type PartialUpdateReport = Partial<IReport> & Pick<IReport, 'id'>;

type RestOf<T extends IReport | NewReport> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestReport = RestOf<IReport>;

export type NewRestReport = RestOf<NewReport>;

export type PartialUpdateRestReport = RestOf<PartialUpdateReport>;

export type EntityResponseType = HttpResponse<IReport>;
export type EntityArrayResponseType = HttpResponse<IReport[]>;

@Injectable({ providedIn: 'root' })
export class ReportService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/reports');
  protected resourceSearchUrl = this.applicationConfigService.getEndpointFor('api/reports/_search');

  constructor(
    protected http: HttpClient,
    protected applicationConfigService: ApplicationConfigService,
  ) {}

  create(report: NewReport): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(report);
    return this.http
      .post<RestReport>(this.resourceUrl, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(report: IReport): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(report);
    return this.http
      .put<RestReport>(`${this.resourceUrl}/${this.getReportIdentifier(report)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(report: PartialUpdateReport): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(report);
    return this.http
      .patch<RestReport>(`${this.resourceUrl}/${this.getReportIdentifier(report)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<EntityResponseType> {
    return this.http
      .get<RestReport>(`${this.resourceUrl}/${id}`, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http
      .get<RestReport[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => this.convertResponseArrayFromServer(res)));
  }

  delete(id: string): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  search(req: Search): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<RestReport[]>(this.resourceSearchUrl, { params: options, observe: 'response' }).pipe(
      map(res => this.convertResponseArrayFromServer(res)),
      catchError(() => scheduled([new HttpResponse<IReport[]>()], asapScheduler)),
    );
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
      const reportCollectionIdentifiers = reportCollection.map(reportItem => this.getReportIdentifier(reportItem)!);
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

  protected convertDateFromClient<T extends IReport | NewReport | PartialUpdateReport>(report: T): RestOf<T> {
    return {
      ...report,
      createdDate: report.createdDate?.format(DATE_FORMAT) ?? null,
      modifiedDate: report.modifiedDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertDateFromServer(restReport: RestReport): IReport {
    return {
      ...restReport,
      createdDate: restReport.createdDate ? dayjs(restReport.createdDate) : undefined,
      modifiedDate: restReport.modifiedDate ? dayjs(restReport.modifiedDate) : undefined,
    };
  }

  protected convertResponseFromServer(res: HttpResponse<RestReport>): HttpResponse<IReport> {
    return res.clone({
      body: res.body ? this.convertDateFromServer(res.body) : null,
    });
  }

  protected convertResponseArrayFromServer(res: HttpResponse<RestReport[]>): HttpResponse<IReport[]> {
    return res.clone({
      body: res.body ? res.body.map(item => this.convertDateFromServer(item)) : null,
    });
  }
}
