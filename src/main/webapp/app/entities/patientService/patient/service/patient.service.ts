import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IPatient, NewPatient } from '../patient.model';

export type PartialUpdatePatient = Partial<IPatient> & Pick<IPatient, 'id'>;

type RestOf<T extends IPatient | NewPatient> = Omit<T, 'lastActivityAt' | 'dateOfBirth'> & {
  lastActivityAt?: string | null;
  dateOfBirth?: string | null;
};

export type RestPatient = RestOf<IPatient>;

export type NewRestPatient = RestOf<NewPatient>;

export type PartialUpdateRestPatient = RestOf<PartialUpdatePatient>;

@Injectable()
export class PatientsService {
  readonly patientsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly patientsResource = httpResource<RestPatient[]>(() => {
    const params = this.patientsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of patient that have been fetched. It is updated when the patientsResource emits a new value.
   * In case of error while fetching the patients, the signal is set to an empty array.
   */
  readonly patients = computed(() =>
    (this.patientsResource.hasValue() ? this.patientsResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/patients');

  protected convertValueFromServer(restPatient: RestPatient): IPatient {
    return {
      ...restPatient,
      lastActivityAt: restPatient.lastActivityAt ? dayjs(restPatient.lastActivityAt) : undefined,
      dateOfBirth: restPatient.dateOfBirth ? dayjs(restPatient.dateOfBirth) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class PatientService extends PatientsService {
  protected readonly http = inject(HttpClient);

  create(patient: NewPatient): Observable<IPatient> {
    const copy = this.convertValueFromClient(patient);
    return this.http.post<RestPatient>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(patient: IPatient): Observable<IPatient> {
    const copy = this.convertValueFromClient(patient);
    return this.http
      .put<RestPatient>(`${this.resourceUrl}/${encodeURIComponent(this.getPatientIdentifier(patient))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(patient: PartialUpdatePatient): Observable<IPatient> {
    const copy = this.convertValueFromClient(patient);
    return this.http
      .patch<RestPatient>(`${this.resourceUrl}/${encodeURIComponent(this.getPatientIdentifier(patient))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IPatient> {
    return this.http
      .get<RestPatient>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IPatient[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestPatient[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getPatientIdentifier(patient: Pick<IPatient, 'id'>): string {
    return patient.id;
  }

  comparePatient(o1: Pick<IPatient, 'id'> | null, o2: Pick<IPatient, 'id'> | null): boolean {
    return o1 && o2 ? this.getPatientIdentifier(o1) === this.getPatientIdentifier(o2) : o1 === o2;
  }

  addPatientToCollectionIfMissing<Type extends Pick<IPatient, 'id'>>(
    patientCollection: Type[],
    ...patientsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const patients: Type[] = patientsToCheck.filter(isPresent);
    if (patients.length > 0) {
      const patientCollectionIdentifiers = patientCollection.map(patientItem => this.getPatientIdentifier(patientItem));
      const patientsToAdd = patients.filter(patientItem => {
        const patientIdentifier = this.getPatientIdentifier(patientItem);
        if (patientCollectionIdentifiers.includes(patientIdentifier)) {
          return false;
        }
        patientCollectionIdentifiers.push(patientIdentifier);
        return true;
      });
      return [...patientsToAdd, ...patientCollection];
    }
    return patientCollection;
  }

  protected convertValueFromClient<T extends IPatient | NewPatient | PartialUpdatePatient>(patient: T): RestOf<T> {
    return {
      ...patient,
      lastActivityAt: patient.lastActivityAt?.toJSON() ?? null,
      dateOfBirth: patient.dateOfBirth?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestPatient): IPatient {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestPatient[]): IPatient[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
