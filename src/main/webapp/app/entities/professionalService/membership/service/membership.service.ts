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
import { IMembership, NewMembership } from '../membership.model';

export type PartialUpdateMembership = Partial<IMembership> & Pick<IMembership, 'id'>;

type RestOf<T extends IMembership | NewMembership> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestMembership = RestOf<IMembership>;

export type NewRestMembership = RestOf<NewMembership>;

export type PartialUpdateRestMembership = RestOf<PartialUpdateMembership>;

export type EntityResponseType = HttpResponse<IMembership>;
export type EntityArrayResponseType = HttpResponse<IMembership[]>;

@Injectable({ providedIn: 'root' })
export class MembershipService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/memberships');
  protected resourceSearchUrl = this.applicationConfigService.getEndpointFor('api/memberships/_search');

  constructor(
    protected http: HttpClient,
    protected applicationConfigService: ApplicationConfigService,
  ) {}

  create(membership: NewMembership): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(membership);
    return this.http
      .post<RestMembership>(this.resourceUrl, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(membership: IMembership): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(membership);
    return this.http
      .put<RestMembership>(`${this.resourceUrl}/${this.getMembershipIdentifier(membership)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(membership: PartialUpdateMembership): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(membership);
    return this.http
      .patch<RestMembership>(`${this.resourceUrl}/${this.getMembershipIdentifier(membership)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<EntityResponseType> {
    return this.http
      .get<RestMembership>(`${this.resourceUrl}/${id}`, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http
      .get<RestMembership[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => this.convertResponseArrayFromServer(res)));
  }

  delete(id: string): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  search(req: Search): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<RestMembership[]>(this.resourceSearchUrl, { params: options, observe: 'response' }).pipe(
      map(res => this.convertResponseArrayFromServer(res)),
      catchError(() => scheduled([new HttpResponse<IMembership[]>()], asapScheduler)),
    );
  }

  getMembershipIdentifier(membership: Pick<IMembership, 'id'>): string {
    return membership.id;
  }

  compareMembership(o1: Pick<IMembership, 'id'> | null, o2: Pick<IMembership, 'id'> | null): boolean {
    return o1 && o2 ? this.getMembershipIdentifier(o1) === this.getMembershipIdentifier(o2) : o1 === o2;
  }

  addMembershipToCollectionIfMissing<Type extends Pick<IMembership, 'id'>>(
    membershipCollection: Type[],
    ...membershipsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const memberships: Type[] = membershipsToCheck.filter(isPresent);
    if (memberships.length > 0) {
      const membershipCollectionIdentifiers = membershipCollection.map(membershipItem => this.getMembershipIdentifier(membershipItem)!);
      const membershipsToAdd = memberships.filter(membershipItem => {
        const membershipIdentifier = this.getMembershipIdentifier(membershipItem);
        if (membershipCollectionIdentifiers.includes(membershipIdentifier)) {
          return false;
        }
        membershipCollectionIdentifiers.push(membershipIdentifier);
        return true;
      });
      return [...membershipsToAdd, ...membershipCollection];
    }
    return membershipCollection;
  }

  protected convertDateFromClient<T extends IMembership | NewMembership | PartialUpdateMembership>(membership: T): RestOf<T> {
    return {
      ...membership,
      createdDate: membership.createdDate?.format(DATE_FORMAT) ?? null,
      modifiedDate: membership.modifiedDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertDateFromServer(restMembership: RestMembership): IMembership {
    return {
      ...restMembership,
      createdDate: restMembership.createdDate ? dayjs(restMembership.createdDate) : undefined,
      modifiedDate: restMembership.modifiedDate ? dayjs(restMembership.modifiedDate) : undefined,
    };
  }

  protected convertResponseFromServer(res: HttpResponse<RestMembership>): HttpResponse<IMembership> {
    return res.clone({
      body: res.body ? this.convertDateFromServer(res.body) : null,
    });
  }

  protected convertResponseArrayFromServer(res: HttpResponse<RestMembership[]>): HttpResponse<IMembership[]> {
    return res.clone({
      body: res.body ? res.body.map(item => this.convertDateFromServer(item)) : null,
    });
  }
}
