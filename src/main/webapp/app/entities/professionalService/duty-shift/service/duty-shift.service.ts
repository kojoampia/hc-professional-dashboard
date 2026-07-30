import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IDutyShift, NewDutyShift } from '../duty-shift.model';

export type PartialUpdateDutyShift = Partial<IDutyShift> & Pick<IDutyShift, 'id'>;

type RestOf<T extends IDutyShift | NewDutyShift> = Omit<T, 'startsAt' | 'endsAt'> & {
  startsAt?: string | null;
  endsAt?: string | null;
};

export type RestDutyShift = RestOf<IDutyShift>;

export type NewRestDutyShift = RestOf<NewDutyShift>;

export type PartialUpdateRestDutyShift = RestOf<PartialUpdateDutyShift>;

@Injectable()
export class DutyShiftsService {
  readonly dutyShiftsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly dutyShiftsResource = httpResource<RestDutyShift[]>(() => {
    const params = this.dutyShiftsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of dutyShift that have been fetched. It is updated when the dutyShiftsResource emits a new value.
   * In case of error while fetching the dutyShifts, the signal is set to an empty array.
   */
  readonly dutyShifts = computed(() =>
    (this.dutyShiftsResource.hasValue() ? this.dutyShiftsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/duty-shifts');

  protected convertValueFromServer(restDutyShift: RestDutyShift): IDutyShift {
    return {
      ...restDutyShift,
      startsAt: restDutyShift.startsAt ? dayjs(restDutyShift.startsAt) : undefined,
      endsAt: restDutyShift.endsAt ? dayjs(restDutyShift.endsAt) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class DutyShiftService extends DutyShiftsService {
  protected readonly http = inject(HttpClient);

  create(dutyShift: NewDutyShift): Observable<IDutyShift> {
    const copy = this.convertValueFromClient(dutyShift);
    return this.http.post<RestDutyShift>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(dutyShift: IDutyShift): Observable<IDutyShift> {
    const copy = this.convertValueFromClient(dutyShift);
    return this.http
      .put<RestDutyShift>(`${this.resourceUrl}/${encodeURIComponent(this.getDutyShiftIdentifier(dutyShift))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(dutyShift: PartialUpdateDutyShift): Observable<IDutyShift> {
    const copy = this.convertValueFromClient(dutyShift);
    return this.http
      .patch<RestDutyShift>(`${this.resourceUrl}/${encodeURIComponent(this.getDutyShiftIdentifier(dutyShift))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IDutyShift> {
    return this.http
      .get<RestDutyShift>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IDutyShift[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestDutyShift[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getDutyShiftIdentifier(dutyShift: Pick<IDutyShift, 'id'>): string {
    return dutyShift.id;
  }

  compareDutyShift(o1: Pick<IDutyShift, 'id'> | null, o2: Pick<IDutyShift, 'id'> | null): boolean {
    return o1 && o2 ? this.getDutyShiftIdentifier(o1) === this.getDutyShiftIdentifier(o2) : o1 === o2;
  }

  addDutyShiftToCollectionIfMissing<Type extends Pick<IDutyShift, 'id'>>(
    dutyShiftCollection: Type[],
    ...dutyShiftsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const dutyShifts: Type[] = dutyShiftsToCheck.filter(isPresent);
    if (dutyShifts.length > 0) {
      const dutyShiftCollectionIdentifiers = dutyShiftCollection.map(dutyShiftItem => this.getDutyShiftIdentifier(dutyShiftItem));
      const dutyShiftsToAdd = dutyShifts.filter(dutyShiftItem => {
        const dutyShiftIdentifier = this.getDutyShiftIdentifier(dutyShiftItem);
        if (dutyShiftCollectionIdentifiers.includes(dutyShiftIdentifier)) {
          return false;
        }
        dutyShiftCollectionIdentifiers.push(dutyShiftIdentifier);
        return true;
      });
      return [...dutyShiftsToAdd, ...dutyShiftCollection];
    }
    return dutyShiftCollection;
  }

  protected convertValueFromClient<T extends IDutyShift | NewDutyShift | PartialUpdateDutyShift>(dutyShift: T): RestOf<T> {
    return {
      ...dutyShift,
      startsAt: dutyShift.startsAt?.toJSON() ?? null,
      endsAt: dutyShift.endsAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestDutyShift): IDutyShift {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestDutyShift[]): IDutyShift[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
