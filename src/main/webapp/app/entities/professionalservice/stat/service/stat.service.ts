import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IStat, NewStat } from '../stat.model';

export type PartialUpdateStat = Partial<IStat> & Pick<IStat, 'id'>;

type RestOf<T extends IStat | NewStat> = Omit<T, 'createdDate'> & {
  createdDate?: string | null;
};

export type RestStat = RestOf<IStat>;

export type NewRestStat = RestOf<NewStat>;

export type PartialUpdateRestStat = RestOf<PartialUpdateStat>;

@Injectable()
export class StatsService {
  readonly statsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(undefined);
  readonly statsResource = httpResource<RestStat[]>(() => {
    const params = this.statsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of stat that have been fetched. It is updated when the statsResource emits a new value.
   * In case of error while fetching the stats, the signal is set to an empty array.
   */
  readonly stats = computed(() =>
    (this.statsResource.hasValue() ? this.statsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/stats', 'professionalservice');

  protected convertValueFromServer(restStat: RestStat): IStat {
    return {
      ...restStat,
      createdDate: restStat.createdDate ? dayjs(restStat.createdDate) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class StatService extends StatsService {
  protected readonly http = inject(HttpClient);

  create(stat: NewStat): Observable<IStat> {
    const copy = this.convertValueFromClient(stat);
    return this.http.post<RestStat>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(stat: IStat): Observable<IStat> {
    const copy = this.convertValueFromClient(stat);
    return this.http
      .put<RestStat>(`${this.resourceUrl}/${encodeURIComponent(this.getStatIdentifier(stat))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(stat: PartialUpdateStat): Observable<IStat> {
    const copy = this.convertValueFromClient(stat);
    return this.http
      .patch<RestStat>(`${this.resourceUrl}/${encodeURIComponent(this.getStatIdentifier(stat))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IStat> {
    return this.http.get<RestStat>(`${this.resourceUrl}/${encodeURIComponent(id)}`).pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IStat[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestStat[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
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
      const statCollectionIdentifiers = statCollection.map(statItem => this.getStatIdentifier(statItem));
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

  protected convertValueFromClient<T extends IStat | NewStat | PartialUpdateStat>(stat: T): RestOf<T> {
    return {
      ...stat,
      createdDate: stat.createdDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestStat): IStat {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestStat[]): IStat[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
