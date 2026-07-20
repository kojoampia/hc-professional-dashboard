import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, ParamMap, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, combineLatest, filter, tap } from 'rxjs';

import { DEFAULT_SORT_DATA, ITEM_DELETED_EVENT, SORT } from 'app/config/navigation.constants';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { TaskDeleteDialog } from '../delete/task-delete-dialog';
import { TaskService } from '../service/task.service';
import { ITask } from '../task.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-task',
  templateUrl: './task.html',
  imports: [
    RouterLink,
    FormsModule,
    FontAwesomeModule,
    AlertError,
    Alert,
    SortDirective,
    SortByDirective,
    TranslateDirective,
    TranslateModule,
    FormatMediumDatePipe,
  ],
})
export class Task implements OnInit {
  private static readonly NOT_SORTABLE_FIELDS_AFTER_SEARCH = [
    'id',
    'name',
    'description',
    'attendantId',
    'teamId',
    'patientId',
    'createdBy',
    'modifiedBy',
  ];

  subscription: Subscription | null = null;
  readonly tasks = signal<ITask[]>([]);

  sortState = sortStateSignal({});
  readonly currentSearch = signal('');

  readonly router = inject(Router);
  protected readonly taskService = inject(TaskService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.taskService.tasksResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  protected modalService = inject(NgbModal);

  constructor() {
    effect(() => {
      this.tasks.set(this.fillComponentAttributesFromResponseBody([...this.taskService.tasks()]));
    });
  }

  trackId = (item: ITask): string => this.taskService.getTaskIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => this.load()),
      )
      .subscribe();
  }

  search(query: string): void {
    this.currentSearch.set(query);
    const { predicate } = this.sortState();
    if (query && predicate && Task.NOT_SORTABLE_FIELDS_AFTER_SEARCH.includes(predicate)) {
      this.navigateToWithComponentValues(this.getDefaultSortState());
      return;
    }
    this.navigateToWithComponentValues(this.sortState());
  }

  getDefaultSortState(): SortState {
    return {};
  }

  delete(task: ITask): void {
    const modalRef = this.modalService.open(TaskDeleteDialog, { size: 'lg', backdrop: 'static' });
    modalRef.componentInstance.task = task;
    // unsubscribe not needed because closed completes on modal close
    modalRef.closed
      .pipe(
        filter(reason => reason === ITEM_DELETED_EVENT),
        tap(() => this.load()),
      )
      .subscribe();
  }

  load(): void {
    this.queryBackend();
  }

  navigateToWithComponentValues(event: SortState): void {
    this.handleNavigation(event, this.currentSearch());
  }

  protected fillComponentAttributeFromRoute(params: ParamMap, data: Data): void {
    this.sortState.set(this.sortService.parseSortParam(params.get(SORT) ?? data[DEFAULT_SORT_DATA]));
    if (params.has('search') && params.get('search') !== '') {
      this.currentSearch.set(params.get('search') as string);
      const { predicate } = this.sortState();
      if (predicate && Task.NOT_SORTABLE_FIELDS_AFTER_SEARCH.includes(predicate)) {
        this.sortState.set({});
      }
    }
  }

  protected refineData(data: ITask[]): ITask[] {
    const { predicate, order } = this.sortState();
    return predicate && order ? data.sort(this.sortService.startSort({ predicate, order })) : data;
  }

  protected fillComponentAttributesFromResponseBody(data: ITask[]): ITask[] {
    return this.refineData(data);
  }

  protected queryBackend(): void {
    const queryObject: any = {
      query: this.currentSearch(),
      sort: this.sortService.buildSortParam(this.sortState()),
    };
    this.taskService.tasksParams.set(queryObject);
  }

  protected handleNavigation(sortState: SortState, currentSearch?: string): void {
    const queryParamsObj = {
      search: currentSearch,
      sort: this.sortService.buildSortParam(sortState),
    };

    this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: queryParamsObj,
    });
  }
}
