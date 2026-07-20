import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IMedCase, NewMedCase } from '../med-case.model';

export type PartialUpdateMedCase = Partial<IMedCase> & Pick<IMedCase, 'id'>;

type RestOf<T extends IMedCase | NewMedCase> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestMedCase = RestOf<IMedCase>;

export type NewRestMedCase = RestOf<NewMedCase>;

export type PartialUpdateRestMedCase = RestOf<PartialUpdateMedCase>;

@Injectable()
export class MedCasesService {
  readonly medCasesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly medCasesResource = httpResource<RestMedCase[]>(() => {
    const params = this.medCasesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of medCase that have been fetched. It is updated when the medCasesResource emits a new value.
   * In case of error while fetching the medCases, the signal is set to an empty array.
   */
  readonly medCases = computed(() =>
    (this.medCasesResource.hasValue() ? this.medCasesResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/med-cases');

  protected convertValueFromServer(restMedCase: RestMedCase): IMedCase {
    return {
      ...restMedCase,
      createdDate: restMedCase.createdDate ? dayjs(restMedCase.createdDate) : undefined,
      modifiedDate: restMedCase.modifiedDate ? dayjs(restMedCase.modifiedDate) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class MedCaseService extends MedCasesService {
  protected readonly http = inject(HttpClient);

  create(medCase: NewMedCase): Observable<IMedCase> {
    const copy = this.convertValueFromClient(medCase);
    return this.http.post<RestMedCase>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(medCase: IMedCase): Observable<IMedCase> {
    const copy = this.convertValueFromClient(medCase);
    return this.http
      .put<RestMedCase>(`${this.resourceUrl}/${encodeURIComponent(this.getMedCaseIdentifier(medCase))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(medCase: PartialUpdateMedCase): Observable<IMedCase> {
    const copy = this.convertValueFromClient(medCase);
    return this.http
      .patch<RestMedCase>(`${this.resourceUrl}/${encodeURIComponent(this.getMedCaseIdentifier(medCase))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IMedCase> {
    return this.http
      .get<RestMedCase>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IMedCase[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestMedCase[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getMedCaseIdentifier(medCase: Pick<IMedCase, 'id'>): string {
    return medCase.id;
  }

  compareMedCase(o1: Pick<IMedCase, 'id'> | null, o2: Pick<IMedCase, 'id'> | null): boolean {
    return o1 && o2 ? this.getMedCaseIdentifier(o1) === this.getMedCaseIdentifier(o2) : o1 === o2;
  }

  addMedCaseToCollectionIfMissing<Type extends Pick<IMedCase, 'id'>>(
    medCaseCollection: Type[],
    ...medCasesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const medCases: Type[] = medCasesToCheck.filter(isPresent);
    if (medCases.length > 0) {
      const medCaseCollectionIdentifiers = medCaseCollection.map(medCaseItem => this.getMedCaseIdentifier(medCaseItem));
      const medCasesToAdd = medCases.filter(medCaseItem => {
        const medCaseIdentifier = this.getMedCaseIdentifier(medCaseItem);
        if (medCaseCollectionIdentifiers.includes(medCaseIdentifier)) {
          return false;
        }
        medCaseCollectionIdentifiers.push(medCaseIdentifier);
        return true;
      });
      return [...medCasesToAdd, ...medCaseCollection];
    }
    return medCaseCollection;
  }

  protected convertValueFromClient<T extends IMedCase | NewMedCase | PartialUpdateMedCase>(medCase: T): RestOf<T> {
    return {
      ...medCase,
      createdDate: medCase.createdDate?.toJSON() ?? null,
      modifiedDate: medCase.modifiedDate?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestMedCase): IMedCase {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestMedCase[]): IMedCase[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
