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
import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { DutyShiftDeleteDialogComponent } from '../delete/duty-shift-delete-dialog';
import { IDutyShift } from '../duty-shift.model';
import { DutyShiftService } from '../service/duty-shift.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-duty-shift',
  templateUrl: './duty-shift.html',
  imports: [RouterLink,
    FormsModule,
    AlertErrorComponent,
    AlertComponent,
    SortDirective,
    SortByDirective,
    TranslateDirective,
    TranslateModule,
    FormatMediumDatetimePipe, MatIconModule],
})
export class DutyShiftComponent implements OnInit {
  subscription: Subscription | null = null;
  readonly dutyShifts = signal<IDutyShift[]>([]);

  sortState = sortStateSignal({});

  readonly router = inject(Router);
  protected readonly dutyShiftService = inject(DutyShiftService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.dutyShiftService.dutyShiftsResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  protected dialog = inject(MatDialog);

  constructor() {
    effect(() => {
      this.dutyShifts.set(this.fillComponentAttributesFromResponseBody([...this.dutyShiftService.dutyShifts()]));
    });
  }

  trackId = (item: IDutyShift): string => this.dutyShiftService.getDutyShiftIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => {
          if (this.dutyShifts().length === 0) {
            this.load();
          }
        }),
      )
      .subscribe();
  }

  delete(dutyShift: IDutyShift): void {
    const dialogRef = this.dialog.open(DutyShiftDeleteDialogComponent, { width: '32rem', disableClose: true });
    dialogRef.componentInstance.dutyShift = dutyShift;
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

  protected refineData(data: IDutyShift[]): IDutyShift[] {
    const { predicate, ascending } = this.sortState();
    return predicate ? data.sort(this.sortService.startSort(predicate, ascending ? 1 : -1)) : data;
  }

  protected fillComponentAttributesFromResponseBody(data: IDutyShift[]): IDutyShift[] {
    return this.refineData(data);
  }

  protected queryBackend(): void {
    const queryObject: any = {
      sort: this.sortService.buildSortParam(this.sortState()),
    };
    this.dutyShiftService.dutyShiftsParams.set(queryObject);
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
