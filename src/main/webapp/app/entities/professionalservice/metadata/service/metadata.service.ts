import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IMetadata, NewMetadata } from '../metadata.model';

export type PartialUpdateMetadata = Partial<IMetadata> & Pick<IMetadata, 'id'>;

type RestOf<T extends IMetadata | NewMetadata> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestMetadata = RestOf<IMetadata>;

export type NewRestMetadata = RestOf<NewMetadata>;

export type PartialUpdateRestMetadata = RestOf<PartialUpdateMetadata>;

@Injectable()
export class MetadatasService {
  readonly metadatasParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly metadatasResource = httpResource<RestMetadata[]>(() => {
    const params = this.metadatasParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of metadata that have been fetched. It is updated when the metadatasResource emits a new value.
   * In case of error while fetching the metadatas, the signal is set to an empty array.
   */
  readonly metadatas = computed(() =>
    (this.metadatasResource.hasValue() ? this.metadatasResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/metadata', 'professionalservice');

  protected convertValueFromServer(restMetadata: RestMetadata): IMetadata {
    return {
      ...restMetadata,
      createdDate: restMetadata.createdDate ? dayjs(restMetadata.createdDate) : undefined,
      modifiedDate: restMetadata.modifiedDate ? dayjs(restMetadata.modifiedDate) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class MetadataService extends MetadatasService {
  protected readonly http = inject(HttpClient);

  create(metadata: NewMetadata): Observable<IMetadata> {
    const copy = this.convertValueFromClient(metadata);
    return this.http.post<RestMetadata>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(metadata: IMetadata): Observable<IMetadata> {
    const copy = this.convertValueFromClient(metadata);
    return this.http
      .put<RestMetadata>(`${this.resourceUrl}/${encodeURIComponent(this.getMetadataIdentifier(metadata))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(metadata: PartialUpdateMetadata): Observable<IMetadata> {
    const copy = this.convertValueFromClient(metadata);
    return this.http
      .patch<RestMetadata>(`${this.resourceUrl}/${encodeURIComponent(this.getMetadataIdentifier(metadata))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IMetadata> {
    return this.http
      .get<RestMetadata>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IMetadata[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestMetadata[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getMetadataIdentifier(metadata: Pick<IMetadata, 'id'>): string {
    return metadata.id;
  }

  compareMetadata(o1: Pick<IMetadata, 'id'> | null, o2: Pick<IMetadata, 'id'> | null): boolean {
    return o1 && o2 ? this.getMetadataIdentifier(o1) === this.getMetadataIdentifier(o2) : o1 === o2;
  }

  addMetadataToCollectionIfMissing<Type extends Pick<IMetadata, 'id'>>(
    metadataCollection: Type[],
    ...metadatasToCheck: (Type | null | undefined)[]
  ): Type[] {
    const metadatas: Type[] = metadatasToCheck.filter(isPresent);
    if (metadatas.length > 0) {
      const metadataCollectionIdentifiers = metadataCollection.map(metadataItem => this.getMetadataIdentifier(metadataItem));
      const metadatasToAdd = metadatas.filter(metadataItem => {
        const metadataIdentifier = this.getMetadataIdentifier(metadataItem);
        if (metadataCollectionIdentifiers.includes(metadataIdentifier)) {
          return false;
        }
        metadataCollectionIdentifiers.push(metadataIdentifier);
        return true;
      });
      return [...metadatasToAdd, ...metadataCollection];
    }
    return metadataCollection;
  }

  protected convertValueFromClient<T extends IMetadata | NewMetadata | PartialUpdateMetadata>(metadata: T): RestOf<T> {
    return {
      ...metadata,
      createdDate: metadata.createdDate?.format(DATE_FORMAT) ?? null,
      modifiedDate: metadata.modifiedDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestMetadata): IMetadata {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestMetadata[]): IMetadata[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
