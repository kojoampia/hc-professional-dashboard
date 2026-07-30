import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IClinicalCase, NewClinicalCase } from '../clinical-case.model';

export type PartialUpdateClinicalCase = Partial<IClinicalCase> & Pick<IClinicalCase, 'id'>;

type RestOf<T extends IClinicalCase | NewClinicalCase> = Omit<T, 'openedAt'> & {
  openedAt?: string | null;
};

export type RestClinicalCase = RestOf<IClinicalCase>;

export type NewRestClinicalCase = RestOf<NewClinicalCase>;

export type PartialUpdateRestClinicalCase = RestOf<PartialUpdateClinicalCase>;

@Injectable()
export class ClinicalCasesService {
  readonly clinicalCasesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly clinicalCasesResource = httpResource<RestClinicalCase[]>(() => {
    const params = this.clinicalCasesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of clinicalCase that have been fetched. It is updated when the clinicalCasesResource emits a new value.
   * In case of error while fetching the clinicalCases, the signal is set to an empty array.
   */
  readonly clinicalCases = computed(() =>
    (this.clinicalCasesResource.hasValue() ? this.clinicalCasesResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/clinical-cases');

  protected convertValueFromServer(restClinicalCase: RestClinicalCase): IClinicalCase {
    return {
      ...restClinicalCase,
      openedAt: restClinicalCase.openedAt ? dayjs(restClinicalCase.openedAt) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ClinicalCaseService extends ClinicalCasesService {
  protected readonly http = inject(HttpClient);

  create(clinicalCase: NewClinicalCase): Observable<IClinicalCase> {
    const copy = this.convertValueFromClient(clinicalCase);
    return this.http.post<RestClinicalCase>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(clinicalCase: IClinicalCase): Observable<IClinicalCase> {
    const copy = this.convertValueFromClient(clinicalCase);
    return this.http
      .put<RestClinicalCase>(`${this.resourceUrl}/${encodeURIComponent(this.getClinicalCaseIdentifier(clinicalCase))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(clinicalCase: PartialUpdateClinicalCase): Observable<IClinicalCase> {
    const copy = this.convertValueFromClient(clinicalCase);
    return this.http
      .patch<RestClinicalCase>(`${this.resourceUrl}/${encodeURIComponent(this.getClinicalCaseIdentifier(clinicalCase))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IClinicalCase> {
    return this.http
      .get<RestClinicalCase>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IClinicalCase[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestClinicalCase[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getClinicalCaseIdentifier(clinicalCase: Pick<IClinicalCase, 'id'>): string {
    return clinicalCase.id;
  }

  compareClinicalCase(o1: Pick<IClinicalCase, 'id'> | null, o2: Pick<IClinicalCase, 'id'> | null): boolean {
    return o1 && o2 ? this.getClinicalCaseIdentifier(o1) === this.getClinicalCaseIdentifier(o2) : o1 === o2;
  }

  addClinicalCaseToCollectionIfMissing<Type extends Pick<IClinicalCase, 'id'>>(
    clinicalCaseCollection: Type[],
    ...clinicalCasesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const clinicalCases: Type[] = clinicalCasesToCheck.filter(isPresent);
    if (clinicalCases.length > 0) {
      const clinicalCaseCollectionIdentifiers = clinicalCaseCollection.map(clinicalCaseItem =>
        this.getClinicalCaseIdentifier(clinicalCaseItem),
      );
      const clinicalCasesToAdd = clinicalCases.filter(clinicalCaseItem => {
        const clinicalCaseIdentifier = this.getClinicalCaseIdentifier(clinicalCaseItem);
        if (clinicalCaseCollectionIdentifiers.includes(clinicalCaseIdentifier)) {
          return false;
        }
        clinicalCaseCollectionIdentifiers.push(clinicalCaseIdentifier);
        return true;
      });
      return [...clinicalCasesToAdd, ...clinicalCaseCollection];
    }
    return clinicalCaseCollection;
  }

  protected convertValueFromClient<T extends IClinicalCase | NewClinicalCase | PartialUpdateClinicalCase>(clinicalCase: T): RestOf<T> {
    return {
      ...clinicalCase,
      openedAt: clinicalCase.openedAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestClinicalCase): IClinicalCase {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestClinicalCase[]): IClinicalCase[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
