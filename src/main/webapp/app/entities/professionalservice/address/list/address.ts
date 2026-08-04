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
import { IAddress } from '../address.model';
import { AddressDeleteDialogComponent } from '../delete/address-delete-dialog';
import { AddressService } from '../service/address.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-address',
  templateUrl: './address.html',
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
export class AddressComponent implements OnInit {
  subscription: Subscription | null = null;
  readonly addresses = signal<IAddress[]>([]);

  sortState = sortStateSignal({});

  readonly router = inject(Router);
  protected readonly addressService = inject(AddressService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.addressService.addressesResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  protected dialog = inject(MatDialog);

  constructor() {
    effect(() => {
      this.addresses.set(this.fillComponentAttributesFromResponseBody([...this.addressService.addresses()]));
    });
  }

  trackId = (item: IAddress): string => this.addressService.getAddressIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => {
          if (this.addresses().length === 0) {
            this.load();
          }
        }),
      )
      .subscribe();
  }

  delete(address: IAddress): void {
    const dialogRef = this.dialog.open(AddressDeleteDialogComponent, { width: '32rem', disableClose: true });
    dialogRef.componentInstance.address = address;
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

  protected refineData(data: IAddress[]): IAddress[] {
    const { predicate, ascending } = this.sortState();
    return predicate ? data.sort(this.sortService.startSort(predicate, ascending ? 1 : -1)) : data;
  }

  protected fillComponentAttributesFromResponseBody(data: IAddress[]): IAddress[] {
    return this.refineData(data);
  }

  protected queryBackend(): void {
    const queryObject: any = {
      sort: this.sortService.buildSortParam(this.sortState()),
    };
    this.addressService.addressesParams.set(queryObject);
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
