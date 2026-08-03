import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IDocument, NewDocument } from '../document.model';

export type PartialUpdateDocument = Partial<IDocument> & Pick<IDocument, 'id'>;

type RestOf<T extends IDocument | NewDocument> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestDocument = RestOf<IDocument>;

export type NewRestDocument = RestOf<NewDocument>;

export type PartialUpdateRestDocument = RestOf<PartialUpdateDocument>;

@Injectable()
export class DocumentsService {
  readonly documentsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly documentsResource = httpResource<RestDocument[]>(() => {
    const params = this.documentsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of document that have been fetched. It is updated when the documentsResource emits a new value.
   * In case of error while fetching the documents, the signal is set to an empty array.
   */
  readonly documents = computed(() =>
    (this.documentsResource.hasValue() ? this.documentsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/documents', 'professionalservice');

  protected convertValueFromServer(restDocument: RestDocument): IDocument {
    return {
      ...restDocument,
      createdDate: restDocument.createdDate ? dayjs(restDocument.createdDate) : undefined,
      modifiedDate: restDocument.modifiedDate ? dayjs(restDocument.modifiedDate) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class DocumentService extends DocumentsService {
  protected readonly http = inject(HttpClient);

  create(document: NewDocument): Observable<IDocument> {
    const copy = this.convertValueFromClient(document);
    return this.http.post<RestDocument>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(document: IDocument): Observable<IDocument> {
    const copy = this.convertValueFromClient(document);
    return this.http
      .put<RestDocument>(`${this.resourceUrl}/${encodeURIComponent(this.getDocumentIdentifier(document))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(document: PartialUpdateDocument): Observable<IDocument> {
    const copy = this.convertValueFromClient(document);
    return this.http
      .patch<RestDocument>(`${this.resourceUrl}/${encodeURIComponent(this.getDocumentIdentifier(document))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IDocument> {
    return this.http
      .get<RestDocument>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IDocument[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestDocument[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getDocumentIdentifier(document: Pick<IDocument, 'id'>): string {
    return document.id;
  }

  compareDocument(o1: Pick<IDocument, 'id'> | null, o2: Pick<IDocument, 'id'> | null): boolean {
    return o1 && o2 ? this.getDocumentIdentifier(o1) === this.getDocumentIdentifier(o2) : o1 === o2;
  }

  addDocumentToCollectionIfMissing<Type extends Pick<IDocument, 'id'>>(
    documentCollection: Type[],
    ...documentsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const documents: Type[] = documentsToCheck.filter(isPresent);
    if (documents.length > 0) {
      const documentCollectionIdentifiers = documentCollection.map(documentItem => this.getDocumentIdentifier(documentItem));
      const documentsToAdd = documents.filter(documentItem => {
        const documentIdentifier = this.getDocumentIdentifier(documentItem);
        if (documentCollectionIdentifiers.includes(documentIdentifier)) {
          return false;
        }
        documentCollectionIdentifiers.push(documentIdentifier);
        return true;
      });
      return [...documentsToAdd, ...documentCollection];
    }
    return documentCollection;
  }

  protected convertValueFromClient<T extends IDocument | NewDocument | PartialUpdateDocument>(document: T): RestOf<T> {
    return {
      ...document,
      createdDate: document.createdDate?.format(DATE_FORMAT) ?? null,
      modifiedDate: document.modifiedDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestDocument): IDocument {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestDocument[]): IDocument[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
