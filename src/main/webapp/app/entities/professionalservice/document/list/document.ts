import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, ParamMap, Router, RouterLink } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, combineLatest, filter, tap } from 'rxjs';

import { DEFAULT_SORT_DATA, ITEM_DELETED_EVENT, SORT } from 'app/config/navigation.constants';
import { DataUtils } from 'app/core/util/data-util.service';
import { AlertComponent } from 'app/shared/alert/alert.component';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { SortByDirective, SortDirective, SortService, type SortState, sortStateSignal } from 'app/shared/sort';
import { DocumentDeleteDialogComponent } from '../delete/document-delete-dialog';
import { IDocument } from '../document.model';
import { DocumentService } from '../service/document.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-document',
  templateUrl: './document.html',
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
export class DocumentComponent implements OnInit {
  subscription: Subscription | null = null;
  readonly documents = signal<IDocument[]>([]);

  sortState = sortStateSignal({});

  readonly router = inject(Router);
  protected readonly documentService = inject(DocumentService);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isLoading = this.documentService.documentsResource.isLoading;
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly sortService = inject(SortService);
  protected dataUtils = inject(DataUtils);
  protected dialog = inject(MatDialog);

  constructor() {
    effect(() => {
      this.documents.set(this.fillComponentAttributesFromResponseBody([...this.documentService.documents()]));
    });
  }

  trackId = (item: IDocument): string => this.documentService.getDocumentIdentifier(item);

  ngOnInit(): void {
    this.subscription = combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data])
      .pipe(
        tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
        tap(() => {
          if (this.documents().length === 0) {
            this.load();
          }
        }),
      )
      .subscribe();
  }

  byteSize(base64String: string): string {
    return this.dataUtils.byteSize(base64String);
  }

  openFile(base64String: string, contentType: string | null | undefined): void {
    return this.dataUtils.openFile(base64String, contentType);
  }

  delete(document: IDocument): void {
    const dialogRef = this.dialog.open(DocumentDeleteDialogComponent, { width: '32rem', disableClose: true });
    dialogRef.componentInstance.document = document;
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

  protected refineData(data: IDocument[]): IDocument[] {
    const { predicate, ascending } = this.sortState();
    return predicate ? data.sort(this.sortService.startSort(predicate, ascending ? 1 : -1)) : data;
  }

  protected fillComponentAttributesFromResponseBody(data: IDocument[]): IDocument[] {
    return this.refineData(data);
  }

  protected queryBackend(): void {
    const queryObject: any = {
      sort: this.sortService.buildSortParam(this.sortState()),
    };
    this.documentService.documentsParams.set(queryObject);
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
