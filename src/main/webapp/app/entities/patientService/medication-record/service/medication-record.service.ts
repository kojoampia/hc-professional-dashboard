import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IMedicationRecord, NewMedicationRecord } from '../medication-record.model';

export type PartialUpdateMedicationRecord = Partial<IMedicationRecord> & Pick<IMedicationRecord, 'id'>;

type RestOf<T extends IMedicationRecord | NewMedicationRecord> = Omit<T, 'occurredAt'> & {
  occurredAt?: string | null;
};

export type RestMedicationRecord = RestOf<IMedicationRecord>;

export type NewRestMedicationRecord = RestOf<NewMedicationRecord>;

export type PartialUpdateRestMedicationRecord = RestOf<PartialUpdateMedicationRecord>;

@Injectable()
export class MedicationRecordsService {
  readonly medicationRecordsParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly medicationRecordsResource = httpResource<RestMedicationRecord[]>(() => {
    const params = this.medicationRecordsParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of medicationRecord that have been fetched. It is updated when the medicationRecordsResource emits a new value.
   * In case of error while fetching the medicationRecords, the signal is set to an empty array.
   */
  readonly medicationRecords = computed(() =>
    (this.medicationRecordsResource.hasValue() ? this.medicationRecordsResource.value() : []).map(item =>
      this.convertValueFromServer(item),
    ),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/medication-records');

  protected convertValueFromServer(restMedicationRecord: RestMedicationRecord): IMedicationRecord {
    return {
      ...restMedicationRecord,
      occurredAt: restMedicationRecord.occurredAt ? dayjs(restMedicationRecord.occurredAt) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class MedicationRecordService extends MedicationRecordsService {
  protected readonly http = inject(HttpClient);

  create(medicationRecord: NewMedicationRecord): Observable<IMedicationRecord> {
    const copy = this.convertValueFromClient(medicationRecord);
    return this.http.post<RestMedicationRecord>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(medicationRecord: IMedicationRecord): Observable<IMedicationRecord> {
    const copy = this.convertValueFromClient(medicationRecord);
    return this.http
      .put<RestMedicationRecord>(`${this.resourceUrl}/${encodeURIComponent(this.getMedicationRecordIdentifier(medicationRecord))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(medicationRecord: PartialUpdateMedicationRecord): Observable<IMedicationRecord> {
    const copy = this.convertValueFromClient(medicationRecord);
    return this.http
      .patch<RestMedicationRecord>(`${this.resourceUrl}/${encodeURIComponent(this.getMedicationRecordIdentifier(medicationRecord))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IMedicationRecord> {
    return this.http
      .get<RestMedicationRecord>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IMedicationRecord[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestMedicationRecord[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getMedicationRecordIdentifier(medicationRecord: Pick<IMedicationRecord, 'id'>): string {
    return medicationRecord.id;
  }

  compareMedicationRecord(o1: Pick<IMedicationRecord, 'id'> | null, o2: Pick<IMedicationRecord, 'id'> | null): boolean {
    return o1 && o2 ? this.getMedicationRecordIdentifier(o1) === this.getMedicationRecordIdentifier(o2) : o1 === o2;
  }

  addMedicationRecordToCollectionIfMissing<Type extends Pick<IMedicationRecord, 'id'>>(
    medicationRecordCollection: Type[],
    ...medicationRecordsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const medicationRecords: Type[] = medicationRecordsToCheck.filter(isPresent);
    if (medicationRecords.length > 0) {
      const medicationRecordCollectionIdentifiers = medicationRecordCollection.map(medicationRecordItem =>
        this.getMedicationRecordIdentifier(medicationRecordItem),
      );
      const medicationRecordsToAdd = medicationRecords.filter(medicationRecordItem => {
        const medicationRecordIdentifier = this.getMedicationRecordIdentifier(medicationRecordItem);
        if (medicationRecordCollectionIdentifiers.includes(medicationRecordIdentifier)) {
          return false;
        }
        medicationRecordCollectionIdentifiers.push(medicationRecordIdentifier);
        return true;
      });
      return [...medicationRecordsToAdd, ...medicationRecordCollection];
    }
    return medicationRecordCollection;
  }

  protected convertValueFromClient<T extends IMedicationRecord | NewMedicationRecord | PartialUpdateMedicationRecord>(
    medicationRecord: T,
  ): RestOf<T> {
    return {
      ...medicationRecord,
      occurredAt: medicationRecord.occurredAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestMedicationRecord): IMedicationRecord {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestMedicationRecord[]): IMedicationRecord[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
