import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IActivityLogEntry, NewActivityLogEntry } from '../activity-log-entry.model';

export type PartialUpdateActivityLogEntry = Partial<IActivityLogEntry> & Pick<IActivityLogEntry, 'id'>;

type RestOf<T extends IActivityLogEntry | NewActivityLogEntry> = Omit<T, 'occurredAt' | 'createdAt'> & {
  occurredAt?: string | null;
  createdAt?: string | null;
};

export type RestActivityLogEntry = RestOf<IActivityLogEntry>;

export type NewRestActivityLogEntry = RestOf<NewActivityLogEntry>;

export type PartialUpdateRestActivityLogEntry = RestOf<PartialUpdateActivityLogEntry>;

@Injectable()
export class ActivityLogEntriesService {
  readonly activityLogEntriesParams = signal<
    Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined
  >(undefined);
  readonly activityLogEntriesResource = httpResource<RestActivityLogEntry[]>(() => {
    const params = this.activityLogEntriesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of activityLogEntry that have been fetched. It is updated when the activityLogEntriesResource emits a new value.
   * In case of error while fetching the activityLogEntries, the signal is set to an empty array.
   */
  readonly activityLogEntries = computed(() =>
    (this.activityLogEntriesResource.hasValue() ? this.activityLogEntriesResource.value() : []).map(item =>
      this.convertValueFromServer(item),
    ),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/activity-log-entries');

  protected convertValueFromServer(restActivityLogEntry: RestActivityLogEntry): IActivityLogEntry {
    return {
      ...restActivityLogEntry,
      occurredAt: restActivityLogEntry.occurredAt ? dayjs(restActivityLogEntry.occurredAt) : undefined,
      createdAt: restActivityLogEntry.createdAt ? dayjs(restActivityLogEntry.createdAt) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ActivityLogEntryService extends ActivityLogEntriesService {
  protected readonly http = inject(HttpClient);

  create(activityLogEntry: NewActivityLogEntry): Observable<IActivityLogEntry> {
    const copy = this.convertValueFromClient(activityLogEntry);
    return this.http.post<RestActivityLogEntry>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(activityLogEntry: IActivityLogEntry): Observable<IActivityLogEntry> {
    const copy = this.convertValueFromClient(activityLogEntry);
    return this.http
      .put<RestActivityLogEntry>(`${this.resourceUrl}/${encodeURIComponent(this.getActivityLogEntryIdentifier(activityLogEntry))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(activityLogEntry: PartialUpdateActivityLogEntry): Observable<IActivityLogEntry> {
    const copy = this.convertValueFromClient(activityLogEntry);
    return this.http
      .patch<RestActivityLogEntry>(`${this.resourceUrl}/${encodeURIComponent(this.getActivityLogEntryIdentifier(activityLogEntry))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IActivityLogEntry> {
    return this.http
      .get<RestActivityLogEntry>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IActivityLogEntry[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestActivityLogEntry[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getActivityLogEntryIdentifier(activityLogEntry: Pick<IActivityLogEntry, 'id'>): string {
    return activityLogEntry.id;
  }

  compareActivityLogEntry(o1: Pick<IActivityLogEntry, 'id'> | null, o2: Pick<IActivityLogEntry, 'id'> | null): boolean {
    return o1 && o2 ? this.getActivityLogEntryIdentifier(o1) === this.getActivityLogEntryIdentifier(o2) : o1 === o2;
  }

  addActivityLogEntryToCollectionIfMissing<Type extends Pick<IActivityLogEntry, 'id'>>(
    activityLogEntryCollection: Type[],
    ...activityLogEntriesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const activityLogEntries: Type[] = activityLogEntriesToCheck.filter(isPresent);
    if (activityLogEntries.length > 0) {
      const activityLogEntryCollectionIdentifiers = activityLogEntryCollection.map(activityLogEntryItem =>
        this.getActivityLogEntryIdentifier(activityLogEntryItem),
      );
      const activityLogEntriesToAdd = activityLogEntries.filter(activityLogEntryItem => {
        const activityLogEntryIdentifier = this.getActivityLogEntryIdentifier(activityLogEntryItem);
        if (activityLogEntryCollectionIdentifiers.includes(activityLogEntryIdentifier)) {
          return false;
        }
        activityLogEntryCollectionIdentifiers.push(activityLogEntryIdentifier);
        return true;
      });
      return [...activityLogEntriesToAdd, ...activityLogEntryCollection];
    }
    return activityLogEntryCollection;
  }

  protected convertValueFromClient<T extends IActivityLogEntry | NewActivityLogEntry | PartialUpdateActivityLogEntry>(
    activityLogEntry: T,
  ): RestOf<T> {
    return {
      ...activityLogEntry,
      occurredAt: activityLogEntry.occurredAt?.toJSON() ?? null,
      createdAt: activityLogEntry.createdAt?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestActivityLogEntry): IActivityLogEntry {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestActivityLogEntry[]): IActivityLogEntry[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
