import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IDutyRoster, NewDutyRoster } from '../duty-roster.model';

export type PartialUpdateDutyRoster = Partial<IDutyRoster> & Pick<IDutyRoster, 'id'>;

@Injectable()
export class DutyRostersService {
  readonly dutyRostersParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly dutyRostersResource = httpResource<IDutyRoster[]>(() => {
    const params = this.dutyRostersParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of dutyRoster that have been fetched. It is updated when the dutyRostersResource emits a new value.
   * In case of error while fetching the dutyRosters, the signal is set to an empty array.
   */
  readonly dutyRosters = computed(() => (this.dutyRostersResource.hasValue() ? this.dutyRostersResource.value() : []));
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/duty-rosters');
}

@Injectable({ providedIn: 'root' })
export class DutyRosterService extends DutyRostersService {
  protected readonly http = inject(HttpClient);

  create(dutyRoster: NewDutyRoster): Observable<IDutyRoster> {
    return this.http.post<IDutyRoster>(this.resourceUrl, dutyRoster);
  }

  update(dutyRoster: IDutyRoster): Observable<IDutyRoster> {
    return this.http.put<IDutyRoster>(`${this.resourceUrl}/${encodeURIComponent(this.getDutyRosterIdentifier(dutyRoster))}`, dutyRoster);
  }

  partialUpdate(dutyRoster: PartialUpdateDutyRoster): Observable<IDutyRoster> {
    return this.http.patch<IDutyRoster>(`${this.resourceUrl}/${encodeURIComponent(this.getDutyRosterIdentifier(dutyRoster))}`, dutyRoster);
  }

  find(id: string): Observable<IDutyRoster> {
    return this.http.get<IDutyRoster>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  query(req?: any): Observable<HttpResponse<IDutyRoster[]>> {
    const options = createRequestOption(req);
    return this.http.get<IDutyRoster[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getDutyRosterIdentifier(dutyRoster: Pick<IDutyRoster, 'id'>): string {
    return dutyRoster.id;
  }

  compareDutyRoster(o1: Pick<IDutyRoster, 'id'> | null, o2: Pick<IDutyRoster, 'id'> | null): boolean {
    return o1 && o2 ? this.getDutyRosterIdentifier(o1) === this.getDutyRosterIdentifier(o2) : o1 === o2;
  }

  addDutyRosterToCollectionIfMissing<Type extends Pick<IDutyRoster, 'id'>>(
    dutyRosterCollection: Type[],
    ...dutyRostersToCheck: (Type | null | undefined)[]
  ): Type[] {
    const dutyRosters: Type[] = dutyRostersToCheck.filter(isPresent);
    if (dutyRosters.length > 0) {
      const dutyRosterCollectionIdentifiers = dutyRosterCollection.map(dutyRosterItem => this.getDutyRosterIdentifier(dutyRosterItem));
      const dutyRostersToAdd = dutyRosters.filter(dutyRosterItem => {
        const dutyRosterIdentifier = this.getDutyRosterIdentifier(dutyRosterItem);
        if (dutyRosterCollectionIdentifiers.includes(dutyRosterIdentifier)) {
          return false;
        }
        dutyRosterCollectionIdentifiers.push(dutyRosterIdentifier);
        return true;
      });
      return [...dutyRostersToAdd, ...dutyRosterCollection];
    }
    return dutyRosterCollection;
  }
}
