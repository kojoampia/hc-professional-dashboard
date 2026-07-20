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
import { IMetadata, NewMetadata } from '../metadata.model';

export type PartialUpdateMetadata = Partial<IMetadata> & Pick<IMetadata, 'id'>;

type RestOf<T extends IMetadata | NewMetadata> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestMetadata = RestOf<IMetadata>;

export type NewRestMetadata = RestOf<NewMetadata>;

export type PartialUpdateRestMetadata = RestOf<PartialUpdateMetadata>;

export type EntityResponseType = HttpResponse<IMetadata>;
export type EntityArrayResponseType = HttpResponse<IMetadata[]>;

@Injectable({ providedIn: 'root' })
export class MetadataService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/metadata');
  protected resourceSearchUrl = this.applicationConfigService.getEndpointFor('api/metadata/_search');

  constructor(
    protected http: HttpClient,
    protected applicationConfigService: ApplicationConfigService,
  ) {}

  create(metadata: NewMetadata): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(metadata);
    return this.http
      .post<RestMetadata>(this.resourceUrl, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(metadata: IMetadata): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(metadata);
    return this.http
      .put<RestMetadata>(`${this.resourceUrl}/${this.getMetadataIdentifier(metadata)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(metadata: PartialUpdateMetadata): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(metadata);
    return this.http
      .patch<RestMetadata>(`${this.resourceUrl}/${this.getMetadataIdentifier(metadata)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<EntityResponseType> {
    return this.http
      .get<RestMetadata>(`${this.resourceUrl}/${id}`, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http
      .get<RestMetadata[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => this.convertResponseArrayFromServer(res)));
  }

  delete(id: string): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  search(req: Search): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<RestMetadata[]>(this.resourceSearchUrl, { params: options, observe: 'response' }).pipe(
      map(res => this.convertResponseArrayFromServer(res)),
      catchError(() => scheduled([new HttpResponse<IMetadata[]>()], asapScheduler)),
    );
  }

  getMetadataIdentifier(metadata: Pick<IMetadata, 'id'>): string {
    return metadata.id;
  }

  compareMetadata(o1: Pick<IMetadata, 'id'> | null, o2: Pick<IMetadata, 'id'> | null): boolean {
    return o1 && o2 ? this.getMetadataIdentifier(o1) === this.getMetadataIdentifier(o2) : o1 === o2;
  }

  addMetadataToCollectionIfMissing<Type extends Pick<IMetadata, 'id'>>(
    metadataCollection: Type[],
    ...metadataToCheck: (Type | null | undefined)[]
  ): Type[] {
    const metadata: Type[] = metadataToCheck.filter(isPresent);
    if (metadata.length > 0) {
      const metadataCollectionIdentifiers = metadataCollection.map(metadataItem => this.getMetadataIdentifier(metadataItem)!);
      const metadataToAdd = metadata.filter(metadataItem => {
        const metadataIdentifier = this.getMetadataIdentifier(metadataItem);
        if (metadataCollectionIdentifiers.includes(metadataIdentifier)) {
          return false;
        }
        metadataCollectionIdentifiers.push(metadataIdentifier);
        return true;
      });
      return [...metadataToAdd, ...metadataCollection];
    }
    return metadataCollection;
  }

  protected convertDateFromClient<T extends IMetadata | NewMetadata | PartialUpdateMetadata>(metadata: T): RestOf<T> {
    return {
      ...metadata,
      createdDate: metadata.createdDate?.format(DATE_FORMAT) ?? null,
      modifiedDate: metadata.modifiedDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertDateFromServer(restMetadata: RestMetadata): IMetadata {
    return {
      ...restMetadata,
      createdDate: restMetadata.createdDate ? dayjs(restMetadata.createdDate) : undefined,
      modifiedDate: restMetadata.modifiedDate ? dayjs(restMetadata.modifiedDate) : undefined,
    };
  }

  protected convertResponseFromServer(res: HttpResponse<RestMetadata>): HttpResponse<IMetadata> {
    return res.clone({
      body: res.body ? this.convertDateFromServer(res.body) : null,
    });
  }

  protected convertResponseArrayFromServer(res: HttpResponse<RestMetadata[]>): HttpResponse<IMetadata[]> {
    return res.clone({
      body: res.body ? res.body.map(item => this.convertDateFromServer(item)) : null,
    });
  }
}
