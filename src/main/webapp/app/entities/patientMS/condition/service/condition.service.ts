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
import { ICondition, NewCondition } from '../condition.model';

export type PartialUpdateCondition = Partial<ICondition> & Pick<ICondition, 'id'>;

type RestOf<T extends ICondition | NewCondition> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestCondition = RestOf<ICondition>;

export type NewRestCondition = RestOf<NewCondition>;

export type PartialUpdateRestCondition = RestOf<PartialUpdateCondition>;

export type EntityResponseType = HttpResponse<ICondition>;
export type EntityArrayResponseType = HttpResponse<ICondition[]>;

@Injectable({ providedIn: 'root' })
export class ConditionService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/conditions');
  protected resourceSearchUrl = this.applicationConfigService.getEndpointFor('api/conditions/_search');

  constructor(
    protected http: HttpClient,
    protected applicationConfigService: ApplicationConfigService,
  ) {}

  create(condition: NewCondition): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(condition);
    return this.http
      .post<RestCondition>(this.resourceUrl, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(condition: ICondition): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(condition);
    return this.http
      .put<RestCondition>(`${this.resourceUrl}/${this.getConditionIdentifier(condition)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(condition: PartialUpdateCondition): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(condition);
    return this.http
      .patch<RestCondition>(`${this.resourceUrl}/${this.getConditionIdentifier(condition)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<EntityResponseType> {
    return this.http
      .get<RestCondition>(`${this.resourceUrl}/${id}`, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http
      .get<RestCondition[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => this.convertResponseArrayFromServer(res)));
  }

  delete(id: string): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  search(req: Search): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<RestCondition[]>(this.resourceSearchUrl, { params: options, observe: 'response' }).pipe(
      map(res => this.convertResponseArrayFromServer(res)),
      catchError(() => scheduled([new HttpResponse<ICondition[]>()], asapScheduler)),
    );
  }

  getConditionIdentifier(condition: Pick<ICondition, 'id'>): string {
    return condition.id;
  }

  compareCondition(o1: Pick<ICondition, 'id'> | null, o2: Pick<ICondition, 'id'> | null): boolean {
    return o1 && o2 ? this.getConditionIdentifier(o1) === this.getConditionIdentifier(o2) : o1 === o2;
  }

  addConditionToCollectionIfMissing<Type extends Pick<ICondition, 'id'>>(
    conditionCollection: Type[],
    ...conditionsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const conditions: Type[] = conditionsToCheck.filter(isPresent);
    if (conditions.length > 0) {
      const conditionCollectionIdentifiers = conditionCollection.map(conditionItem => this.getConditionIdentifier(conditionItem)!);
      const conditionsToAdd = conditions.filter(conditionItem => {
        const conditionIdentifier = this.getConditionIdentifier(conditionItem);
        if (conditionCollectionIdentifiers.includes(conditionIdentifier)) {
          return false;
        }
        conditionCollectionIdentifiers.push(conditionIdentifier);
        return true;
      });
      return [...conditionsToAdd, ...conditionCollection];
    }
    return conditionCollection;
  }

  protected convertDateFromClient<T extends ICondition | NewCondition | PartialUpdateCondition>(condition: T): RestOf<T> {
    return {
      ...condition,
      createdDate: condition.createdDate?.format(DATE_FORMAT) ?? null,
      modifiedDate: condition.modifiedDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertDateFromServer(restCondition: RestCondition): ICondition {
    return {
      ...restCondition,
      createdDate: restCondition.createdDate ? dayjs(restCondition.createdDate) : undefined,
      modifiedDate: restCondition.modifiedDate ? dayjs(restCondition.modifiedDate) : undefined,
    };
  }

  protected convertResponseFromServer(res: HttpResponse<RestCondition>): HttpResponse<ICondition> {
    return res.clone({
      body: res.body ? this.convertDateFromServer(res.body) : null,
    });
  }

  protected convertResponseArrayFromServer(res: HttpResponse<RestCondition[]>): HttpResponse<ICondition[]> {
    return res.clone({
      body: res.body ? res.body.map(item => this.convertDateFromServer(item)) : null,
    });
  }
}
