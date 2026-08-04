import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, ParamMap, Router, RouterLink } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, combineLatest, filter, tap } from 'rxjs';

import { DEFAULT_SORT_DATA, ITEM_DELETED_EVENT, SORT } from 'app/config/navigation.constants';
import { AlertComponent } from 'app/shared/alert/alert.component';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { StatDeleteDialogComponent } from '../delete/stat-delete-dialog';
import { StatService } from '../service/stat.service';
import { IStat } from '../stat.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-stat',
  templateUrl: './stat.html',
  imports: [
    RouterLink,
    FormsModule,
    AlertErrorComponent,
    AlertComponent,
    SortDirective,
    SortByDirective,
    TranslateDirective,
    TranslateModule,
    FormatMediumDatePipe,
    MatIconModule,
  ],
})
export class StatComponent implements OnInit {
  subscription: Subscription | null = null;
  readonly stats = signal<IStat[]>([]);

  sortState = sortStateSignal({});

  readonly router = inject(Router);
  protected readonly statService = inject(StatService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.statService.statsResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  protected dialog = inject(MatDialog);

  constructor() {
    effect(() => {
      this.stats.set(this.fillComponentAttributesFromResponseBody([...this.statService.stats()]));
    });
  }

  trackId = (item: IStat): string => this.statService.getStatIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => {
          if (this.stats().length === 0) {
            this.load();
          }
        }),
      )
      .subscribe();
  }

  delete(stat: IStat): void {
    const dialogRef = this.dialog.open(StatDeleteDialogComponent, { width: '32rem', disableClose: true });
    dialogRef.componentInstance.stat = stat;
    // unsubscribe not needed because closed completes on modal close
    dialogRef
      .afterClosed()
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
    this.handleNavigation(event);
  }

  protected fillComponentAttributeFromRoute(params: ParamMap, data: Data): void {
    this.sortState.set(this.sortService.parseSortParam(params.get(SORT) ?? data[DEFAULT_SORT_DATA]));
  }

  protected refineData(data: IStat[]): IStat[] {
    const { predicate, ascending } = this.sortState();
    return predicate ? data.sort(this.sortService.startSort(predicate, ascending ? 1 : -1)) : data;
  }

  protected fillComponentAttributesFromResponseBody(data: IStat[]): IStat[] {
    return this.refineData(data);
  }

  protected queryBackend(): void {
    const queryObject: any = {
      sort: this.sortService.buildSortParam(this.sortState()),
    };
    this.statService.statsParams.set(queryObject);
  }

  protected handleNavigation(sortState: SortState): void {
    const queryParamsObj = {
      sort: this.sortService.buildSortParam(sortState),
    };

    this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: queryParamsObj,
    });
  }
}
