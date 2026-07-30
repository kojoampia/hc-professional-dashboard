import { HttpClient, HttpResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import dayjs from 'dayjs/esm';
import { Observable, map } from 'rxjs';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { isPresent } from 'app/core/util/operators';
import { ITask, NewTask } from '../task.model';

export type PartialUpdateTask = Partial<ITask> & Pick<ITask, 'id'>;

type RestOf<T extends ITask | NewTask> = Omit<T, 'schedule' | 'createdDate' | 'modifiedDate'> & {
  schedule?: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
};

export type RestTask = RestOf<ITask>;

export type NewRestTask = RestOf<NewTask>;

export type PartialUpdateRestTask = RestOf<PartialUpdateTask>;

@Injectable()
export class TasksService {
  readonly tasksParams = signal<Record<string, string | number | boolean | readonly (string | number | boolean)[]> | undefined>(undefined);
  readonly tasksResource = httpResource<RestTask[]>(() => {
    const params = this.tasksParams();
    if (!params) {
      return undefined;
    }
    return { url: this.resourceUrl, params };
  });
  /**
   * This signal holds the list of task that have been fetched. It is updated when the tasksResource emits a new value.
   * In case of error while fetching the tasks, the signal is set to an empty array.
   */
  readonly tasks = computed(() =>
    (this.tasksResource.hasValue() ? this.tasksResource.value() : []).map(item => this.convertValueFromServer(item)),
  );
  protected readonly applicationConfigService = inject(ApplicationConfigService);
  protected readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/tasks');

  protected convertValueFromServer(restTask: RestTask): ITask {
    return {
      ...restTask,
      schedule: restTask.schedule ? dayjs(restTask.schedule) : undefined,
      createdDate: restTask.createdDate ? dayjs(restTask.createdDate) : undefined,
      modifiedDate: restTask.modifiedDate ? dayjs(restTask.modifiedDate) : undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class TaskService extends TasksService {
  protected readonly http = inject(HttpClient);

  create(task: NewTask): Observable<ITask> {
    const copy = this.convertValueFromClient(task);
    return this.http.post<RestTask>(this.resourceUrl, copy).pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(task: ITask): Observable<ITask> {
    const copy = this.convertValueFromClient(task);
    return this.http
      .put<RestTask>(`${this.resourceUrl}/${encodeURIComponent(this.getTaskIdentifier(task))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(task: PartialUpdateTask): Observable<ITask> {
    const copy = this.convertValueFromClient(task);
    return this.http
      .patch<RestTask>(`${this.resourceUrl}/${encodeURIComponent(this.getTaskIdentifier(task))}`, copy)
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: string): Observable<ITask> {
    return this.http.get<RestTask>(`${this.resourceUrl}/${encodeURIComponent(id)}`).pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<HttpResponse<ITask[]>> {
    const options = createRequestOption(req);
    return this.http
      .get<RestTask[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => res.clone({ body: this.convertResponseArrayFromServer(res.body!) })));
  }

  delete(id: string): Observable<undefined> {
    return this.http.delete<undefined>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }

  getTaskIdentifier(task: Pick<ITask, 'id'>): string {
    return task.id;
  }

  compareTask(o1: Pick<ITask, 'id'> | null, o2: Pick<ITask, 'id'> | null): boolean {
    return o1 && o2 ? this.getTaskIdentifier(o1) === this.getTaskIdentifier(o2) : o1 === o2;
  }

  addTaskToCollectionIfMissing<Type extends Pick<ITask, 'id'>>(
    taskCollection: Type[],
    ...tasksToCheck: (Type | null | undefined)[]
  ): Type[] {
    const tasks: Type[] = tasksToCheck.filter(isPresent);
    if (tasks.length > 0) {
      const taskCollectionIdentifiers = taskCollection.map(taskItem => this.getTaskIdentifier(taskItem));
      const tasksToAdd = tasks.filter(taskItem => {
        const taskIdentifier = this.getTaskIdentifier(taskItem);
        if (taskCollectionIdentifiers.includes(taskIdentifier)) {
          return false;
        }
        taskCollectionIdentifiers.push(taskIdentifier);
        return true;
      });
      return [...tasksToAdd, ...taskCollection];
    }
    return taskCollection;
  }

  protected convertValueFromClient<T extends ITask | NewTask | PartialUpdateTask>(task: T): RestOf<T> {
    return {
      ...task,
      schedule: task.schedule?.format(DATE_FORMAT) ?? null,
      createdDate: task.createdDate?.format(DATE_FORMAT) ?? null,
      modifiedDate: task.modifiedDate?.format(DATE_FORMAT) ?? null,
    };
  }

  protected convertResponseFromServer(res: RestTask): ITask {
    return this.convertValueFromServer(res);
  }

  protected convertResponseArrayFromServer(res: RestTask[]): ITask[] {
    return res.map(item => this.convertValueFromServer(item));
  }
}
