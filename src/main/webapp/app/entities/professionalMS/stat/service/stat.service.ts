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
import { IStat, NewStat } from '../stat.model';

export type PartialUpdateStat = Partial<IStat> & Pick<IStat, 'id'>;

type RestOf<T extends IStat | NewStat> = Omit<T, 'createdDate'> & {
  createdDate?: string | null;
};

export type RestStat = RestOf<IStat>;

export type NewRestStat = RestOf<NewStat>;

export type PartialUpdateRestStat = RestOf<PartialUpdateStat>;

export type EntityResponseType = HttpResponse<IStat>;
export type EntityArrayResponseType = HttpResponse<IStat[]>;

@Injectable({ providedIn: 'root' })
export class StatService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/stats');
  protected resourceSearchUrl = this.applicationConfigService.getEndpointFor('api/stats/_search');

  constructor(
    protected http: HttpClient,
    protected applicationConfigService: ApplicationConfigService,
  ) {}

  create(stat: NewStat): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(stat);
    return this.http.post<RestStat>(this.resourceUrl, copy, { observe: 'response' }).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(stat: IStat): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(stat);
    return this.http
      .put<RestStat>(`${this.resourceUrl}/${this.getStatIdentifier(stat)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(stat: PartialUpdateStat): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(stat);
    return this.http
      .patch<RestStat>(`${this.resourceUrl}/${this.getStatIdentifier(stat)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<EntityResponseType> {
    return this.http
      .get<RestStat>(`${this.resourceUrl}/${id}`, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http
      .get<RestStat[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => this.convertResponseArrayFromServer(res)));
  }

  delete(id: string): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  search(req: Search): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<RestStat[]>(this.resourceSearchUrl, { params: options, observe: 'response' }).pipe(
      map(res => this.convertResponseArrayFromServer(res)),
      catchError(() => scheduled([new HttpResponse<IStat[]>()], asapScheduler)),
    );
  }

  getStatIdentifier(stat: Pick<IStat, 'id'>): string {
    return stat.id;
  }

  compareStat(o1: Pick<IStat, 'id'> | null, o2: Pick<IStat, 'id'> | null): boolean {
    return o1 && o2 ? this.getStatIdentifier(o1) === this.getStatIdentifier(o2) : o1 === o2;
  }

  addStatToCollectionIfMissing<Type extends Pick<IStat, 'id'>>(
    statCollection: Type[],
    ...statsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const stats: Type[] = statsToCheck.filter(isPresent);
    if (stats.length > 0) {
      const statCollectionIdentifiers = statCollection.map(statItem => this.getStatIdentifier(statItem)!);
      const statsToAdd = stats.filter(statItem => {
        const statIdentifier = this.getStatIdentifier(statItem);
        if (statCollectionIdentifiers.includes(statIdentifier)) {
          return false;
        }
        statCollectionIdentifiers.push(statIdentifier);
        return true;
      });
      return [...statsToAdd, ...statCollection];
    }
    return statCollection;
  }

  protected convertDateFromClient<T extends IStat | NewStat | PartialUpdateStat>(stat: T): RestOf<T> {
    return {
      ...stat,
      createdDate: stat.createdDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertDateFromServer(restStat: RestStat): IStat {
    return {
      ...restStat,
      createdDate: restStat.createdDate ? dayjs(restStat.createdDate) : undefined,
    };
  }

  protected convertResponseFromServer(res: HttpResponse<RestStat>): HttpResponse<IStat> {
    return res.clone({
      body: res.body ? this.convertDateFromServer(res.body) : null,
    });
  }

  protected convertResponseArrayFromServer(res: HttpResponse<RestStat[]>): HttpResponse<IStat[]> {
    return res.clone({
      body: res.body ? res.body.map(item => this.convertDateFromServer(item)) : null,
    });
  }
}
