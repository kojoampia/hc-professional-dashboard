import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { IActivity, NewActivity } from '../activity.model';

export type PartialUpdateActivity = Partial<IActivity> & Pick<IActivity, 'id'>;

type RestOf<T extends IActivity | NewActivity> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestActivity = RestOf<IActivity>;

export type NewRestActivity = RestOf<NewActivity>;

export type PartialUpdateRestActivity = RestOf<PartialUpdateActivity>;

@Injectable()
export class ActivitiesService {
  readonly activitiesParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(
    undefined,
  );
  readonly activitiesResource = httpResource<RestActivity[]>(() => {
    const params = this.activitiesParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of activity that have been fetched. It is updated when the activitiesResource emits a new value.
   * In case of error while fetching the activities, the signal is set to an empty array.
   */
  readonly activities = computed(() =>
    (this.activitiesResource.hasValue() ? this.activitiesResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/activities');

  protected convertValueFromServer(restActivity: RestActivity): IActivity {
    return {
      ...restActivity,
      createdDate: restActivity.createdDate ? dayjs(restActivity.createdDate) : undefined,
      modifiedDate: restActivity.modifiedDate ? dayjs(restActivity.modifiedDate) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ActivityService extends ActivitiesService {
  protected readonly http = inject(HttpClient);

  create(activity: NewActivity): Observable<IActivity> {
    const copy = this.convertValueFromClient(activity);
    return this.http.post<RestActivity>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(activity: IActivity): Observable<IActivity> {
    const copy = this.convertValueFromClient(activity);
    return this.http
      .put<RestActivity>(`${this.resourceUrl}/${encodeURIComponent(this.getActivityIdentifier(activity))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(activity: PartialUpdateActivity): Observable<IActivity> {
    const copy = this.convertValueFromClient(activity);
    return this.http
      .patch<RestActivity>(`${this.resourceUrl}/${encodeURIComponent(this.getActivityIdentifier(activity))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<IActivity> {
    return this.http
      .get<RestActivity>(`${this.resourceUrl}/${encodeURIComponent(id)}`)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<IActivity[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestActivity[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getActivityIdentifier(activity: Pick<IActivity, 'id'>): string {
    return activity.id;
  }

  compareActivity(o1: Pick<IActivity, 'id'> | null, o2: Pick<IActivity, 'id'> | null): boolean {
    return o1 && o2 ? this.getActivityIdentifier(o1) === this.getActivityIdentifier(o2) : o1 === o2;
  }

  addActivityToCollectionIfMissing<Type extends Pick<IActivity, 'id'>>(
    activityCollection: Type[],
    ...activitiesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const activities: Type[] = activitiesToCheck.filter(isPresent);
    if (activities.length > 0) {
      const activityCollectionIdentifiers = activityCollection.map(activityItem => this.getActivityIdentifier(activityItem));
      const activitiesToAdd = activities.filter(activityItem => {
        const activityIdentifier = this.getActivityIdentifier(activityItem);
        if (activityCollectionIdentifiers.includes(activityIdentifier)) {
          return false;
        }
        activityCollectionIdentifiers.push(activityIdentifier);
        return true;
      });
      return [...activitiesToAdd, ...activityCollection];
    }
    return activityCollection;
  }

  protected convertValueFromClient<T extends IActivity | NewActivity | PartialUpdateActivity>(activity: T): RestOf<T> {
    return {
      ...activity,
      createdDate: activity.createdDate?.toJSON() ?? null,
      modifiedDate: activity.modifiedDate?.toJSON() ?? null,
    };
  }

  protected convertResponseFromServer(res: RestActivity): IActivity {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestActivity[]): IActivity[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
