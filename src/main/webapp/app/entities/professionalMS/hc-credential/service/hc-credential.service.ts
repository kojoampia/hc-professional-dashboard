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
import { IHCCredential, NewHCCredential } from '../hc-credential.model';

export type PartialUpdateHCCredential = Partial<IHCCredential> & Pick<IHCCredential, 'id'>;

type RestOf<T extends IHCCredential | NewHCCredential> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestHCCredential = RestOf<IHCCredential>;

export type NewRestHCCredential = RestOf<NewHCCredential>;

export type PartialUpdateRestHCCredential = RestOf<PartialUpdateHCCredential>;

export type EntityResponseType = HttpResponse<IHCCredential>;
export type EntityArrayResponseType = HttpResponse<IHCCredential[]>;

@Injectable({ providedIn: 'root' })
export class HCCredentialService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/hc-credentials');
  protected resourceSearchUrl = this.applicationConfigService.getEndpointFor('api/hc-credentials/_search');

  constructor(
    protected http: HttpClient,
    protected applicationConfigService: ApplicationConfigService,
  ) {}

  create(hCCredential: NewHCCredential): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(hCCredential);
    return this.http
      .post<RestHCCredential>(this.resourceUrl, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(hCCredential: IHCCredential): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(hCCredential);
    return this.http
      .put<RestHCCredential>(`${this.resourceUrl}/${this.getHCCredentialIdentifier(hCCredential)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(hCCredential: PartialUpdateHCCredential): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(hCCredential);
    return this.http
      .patch<RestHCCredential>(`${this.resourceUrl}/${this.getHCCredentialIdentifier(hCCredential)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<EntityResponseType> {
    return this.http
      .get<RestHCCredential>(`${this.resourceUrl}/${id}`, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http
      .get<RestHCCredential[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => this.convertResponseArrayFromServer(res)));
  }

  delete(id: string): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  search(req: Search): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<RestHCCredential[]>(this.resourceSearchUrl, { params: options, observe: 'response' }).pipe(
      map(res => this.convertResponseArrayFromServer(res)),
      catchError(() => scheduled([new HttpResponse<IHCCredential[]>()], asapScheduler)),
    );
  }

  getHCCredentialIdentifier(hCCredential: Pick<IHCCredential, 'id'>): string {
    return hCCredential.id;
  }

  compareHCCredential(o1: Pick<IHCCredential, 'id'> | null, o2: Pick<IHCCredential, 'id'> | null): boolean {
    return o1 && o2 ? this.getHCCredentialIdentifier(o1) === this.getHCCredentialIdentifier(o2) : o1 === o2;
  }

  addHCCredentialToCollectionIfMissing<Type extends Pick<IHCCredential, 'id'>>(
    hCCredentialCollection: Type[],
    ...hCCredentialsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const hCCredentials: Type[] = hCCredentialsToCheck.filter(isPresent);
    if (hCCredentials.length > 0) {
      const hCCredentialCollectionIdentifiers = hCCredentialCollection.map(
        hCCredentialItem => this.getHCCredentialIdentifier(hCCredentialItem)!,
      );
      const hCCredentialsToAdd = hCCredentials.filter(hCCredentialItem => {
        const hCCredentialIdentifier = this.getHCCredentialIdentifier(hCCredentialItem);
        if (hCCredentialCollectionIdentifiers.includes(hCCredentialIdentifier)) {
          return false;
        }
        hCCredentialCollectionIdentifiers.push(hCCredentialIdentifier);
        return true;
      });
      return [...hCCredentialsToAdd, ...hCCredentialCollection];
    }
    return hCCredentialCollection;
  }

  protected convertDateFromClient<T extends IHCCredential | NewHCCredential | PartialUpdateHCCredential>(hCCredential: T): RestOf<T> {
    return {
      ...hCCredential,
      createdDate: hCCredential.createdDate?.format(DATE_FORMAT) ?? null,
      modifiedDate: hCCredential.modifiedDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertDateFromServer(restHCCredential: RestHCCredential): IHCCredential {
    return {
      ...restHCCredential,
      createdDate: restHCCredential.createdDate ? dayjs(restHCCredential.createdDate) : undefined,
      modifiedDate: restHCCredential.modifiedDate ? dayjs(restHCCredential.modifiedDate) : undefined,
    };
  }

  protected convertResponseFromServer(res: HttpResponse<RestHCCredential>): HttpResponse<IHCCredential> {
    return res.clone({
      body: res.body ? this.convertDateFromServer(res.body) : null,
    });
  }

  protected convertResponseArrayFromServer(res: HttpResponse<RestHCCredential[]>): HttpResponse<IHCCredential[]> {
    return res.clone({
      body: res.body ? res.body.map(item => this.convertDateFromServer(item)) : null,
    });
  }
}
