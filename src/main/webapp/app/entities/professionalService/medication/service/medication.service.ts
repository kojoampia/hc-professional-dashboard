import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IMedication, NewMedication } from '../medication.model';

export type PartialUpdateMedication = Partial<IMedication> & Pick<IMedication, 'id'>;

type RestOf<T extends IMedication | NewMedication> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestMedication = RestOf<IMedication>;

export type NewRestMedication = RestOf<NewMedication>;

export type PartialUpdateRestMedication = RestOf<PartialUpdateMedication>;

@Injectable()
export class MedicationsService {
  readonly medicationsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly medicationsResource = httpResource<RestMedication[]>(() => {
    const params = this.medicationsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of medication that have been fetched. It is updated when the medicationsResource emits a new value.
   * In case of error while fetching the medications, the signal is set to an empty array.
   */
  readonly medications = computed(() =>
    (this.medicationsResource.hasValue() ? this.medicationsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/medications');

  protected convertValueFromServer(restMedication: RestMedication): IMedication {
    return {
      ...restMedication,
      createdDate: restMedication.createdDate ? dayjs(restMedication.createdDate) : undefined,
      modifiedDate: restMedication.modifiedDate ? dayjs(restMedication.modifiedDate) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class MedicationService extends MedicationsService {
  protected readonly http = inject(HttpClient);

  create(medication: NewMedication): Observable<IMedication> {
    const copy = this.convertValueFromClient(medication);
    return this.http.post<RestMedication>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(medication: IMedication): Observable<IMedication> {
    const copy = this.convertValueFromClient(medication);
    return this.http
      .put<RestMedication>(`${this.resourceUrl}/${encodeURIComponent(this.getMedicationIdentifier(medication))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(medication: PartialUpdateMedication): Observable<IMedication> {
    const copy = this.convertValueFromClient(medication);
    return this.http
      .patch<RestMedication>(`${this.resourceUrl}/${encodeURIComponent(this.getMedicationIdentifier(medication))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IMedication> {
    return this.http
      .get<RestMedication>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IMedication[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestMedication[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getMedicationIdentifier(medication: Pick<IMedication, 'id'>): string {
    return medication.id;
  }

  compareMedication(o1: Pick<IMedication, 'id'> | null, o2: Pick<IMedication, 'id'> | null): boolean {
    return o1 && o2 ? this.getMedicationIdentifier(o1) === this.getMedicationIdentifier(o2) : o1 === o2;
  }

  addMedicationToCollectionIfMissing<Type extends Pick<IMedication, 'id'>>(
    medicationCollection: Type[],
    ...medicationsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const medications: Type[] = medicationsToCheck.filter(isPresent);
    if (medications.length > 0) {
      const medicationCollectionIdentifiers = medicationCollection.map(medicationItem => this.getMedicationIdentifier(medicationItem));
      const medicationsToAdd = medications.filter(medicationItem => {
        const medicationIdentifier = this.getMedicationIdentifier(medicationItem);
        if (medicationCollectionIdentifiers.includes(medicationIdentifier)) {
          return false;
        }
        medicationCollectionIdentifiers.push(medicationIdentifier);
        return true;
      });
      return [...medicationsToAdd, ...medicationCollection];
    }
    return medicationCollection;
  }

  protected convertValueFromClient<T extends IMedication | NewMedication | PartialUpdateMedication>(medication: T): RestOf<T> {
    return {
      ...medication,
      createdDate: medication.createdDate?.format(DATE_FORMAT) ?? null,
      modifiedDate: medication.modifiedDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestMedication): IMedication {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestMedication[]): IMedication[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
