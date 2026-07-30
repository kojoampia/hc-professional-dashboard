import { HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, ParamMap, Router, RouterLink } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { Subscription, combineLatest, filter, tap } from 'rxjs';

import { DEFAULT_SORT_DATA, ITEM_DELETED_EVENT, SORT } from 'app/config/navigation.constants';
import { ITEMS_PER_PAGE } from 'app/config/pagination.constants';
import { ParseLinks } from 'app/core/util/parse-links.service';
import { AlertComponent } from 'app/shared/alert/alert.component';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { IClinicalCase } from '../clinical-case.model';
import { ClinicalCaseDeleteDialogComponent } from '../delete/clinical-case-delete-dialog';
import { ClinicalCaseService } from '../service/clinical-case.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-clinical-case',
  templateUrl: './clinical-case.html',
  imports: [RouterLink,
    FormsModule,
    AlertErrorComponent,
    AlertComponent,
    SortDirective,
    SortByDirective,
    TranslateDirective,
    TranslateModule,
    FormatMediumDatetimePipe,
    InfiniteScrollDirective, MatIconModule],
})
export class ClinicalCaseComponent implements OnInit {
  subscription: Subscription | null = null;
  readonly clinicalCases = signal<IClinicalCase[]>([]);

  sortState = sortStateSignal({});

  readonly itemsPerPage = signal(ITEMS_PER_PAGE);
  readonly links: WritableSignal<Record<string, undefined | Record<string, string | undefined>>> = signal({});
  readonly hasMorePage = computed(() => !!this.links().next);
  readonly isFirstFetch = computed(() => Object.keys(this.links()).length === 0);

  readonly router = inject(Router);
  protected readonly clinicalCaseService = inject(ClinicalCaseService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.clinicalCaseService.clinicalCasesResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  protected parseLinks = inject(ParseLinks);
  protected dialog = inject(MatDialog);

  constructor() {
    effect(() => {
      const headers = this.clinicalCaseService.clinicalCasesResource.headers();
      if (headers) {
        this.fillComponentAttributesFromResponseHeader(headers);
      }
    });
    effect(() => {
      this.clinicalCases.update(clinicalCases =>
        this.fillComponentAttributesFromResponseBody([...this.clinicalCaseService.clinicalCases()], clinicalCases),
      );
    });
  }

  trackId = (item: IClinicalCase): string => this.clinicalCaseService.getClinicalCaseIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => this.reset()),
        tap(() => this.load()),
      )
      .subscribe();
  }

  reset(): void {
    this.clinicalCases.set([]);
  }

  loadNextPage(): void {
    this.load();
  }

  delete(clinicalCase: IClinicalCase): void {
    const dialogRef = this.dialog.open(ClinicalCaseDeleteDialogComponent, { width: '32rem', disableClose: true });
    dialogRef.componentInstance.clinicalCase = clinicalCase;
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

  protected fillComponentAttributesFromResponseBody(data: IClinicalCase[], currentValue: IClinicalCase[]): IClinicalCase[] {
    const clinicalCasesNew = [...currentValue];
    for (const d of data) {
      if (!clinicalCasesNew.some(op => op.id === d.id)) {
        clinicalCasesNew.push(d);
      }
    }
    return clinicalCasesNew;
  }

  protected fillComponentAttributesFromResponseHeader(headers: HttpHeaders): void {
    const linkHeader = headers.get('link');
    if (linkHeader) {
      this.links.set(this.parseLinks.parseAll(linkHeader));
    } else {
      this.links.set({});
    }
  }

  protected queryBackend(): void {
    const queryObject: any = {
      size: this.itemsPerPage(),
      eagerload: true,
    };
    if (this.hasMorePage()) {
      Object.assign(queryObject, this.links().next);
    } else if (this.isFirstFetch()) {
      Object.assign(queryObject, { sort: this.sortService.buildSortParam(this.sortState()) });
    }

    this.clinicalCaseService.clinicalCasesParams.set(queryObject);
  }

  protected handleNavigation(sortState: SortState): void {
    this.links.set({});

    const queryParamsObj = {
      sort: this.sortService.buildSortParam(sortState),
    };

    this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: queryParamsObj,
    });
  }
}
