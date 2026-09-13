import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import { RestrictedPart } from '../api/restricted-parts';
import { PatientListRow, PatientSex } from '../health-connect.models';
import AsyncStateComponent from '../../shared/health-connect/async-state/async-state.component';
import DataTableComponent, {
  DataTableAction,
  DataTableActionEvent,
  DataTableColumn,
} from '../../shared/health-connect/data-table/data-table.component';
import PaginationComponent from '../../shared/health-connect/data-table/pagination.component';
import SearchInputComponent from '../../shared/health-connect/form-controls/search-input.component';

const DIRECTORY_PAGE_SIZE = 3;

const isPatientSex = (value: string | null): value is PatientSex => value === 'female' || value === 'male' || value === 'unspecified';

@Component({
  standalone: true,
  selector: 'hpd-patient-directory-page',
  imports: [
    AsyncStateComponent,
    DataTableComponent,
    FormsModule,
    MatIconModule,
    PaginationComponent,
    RouterOutlet,
    SearchInputComponent,
    TranslateModule,
  ],
  template: `
    <main class="w-full px-4 py-8 md:px-8">
      <div class="rounded-hpd border border-hpd-border bg-white p-6 shadow-hpd-sm">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 class="sr-only">{{ 'healthConnect.patient.directory' | translate }}</h1>

          <div
            class="flex flex-1 flex-wrap items-end justify-end gap-3 sm:flex-nowrap"
            [attr.aria-label]="'healthConnect.patient.filters' | translate"
          >
            <label class="text-sm">
              <span class="mb-1 block font-medium text-hpd-muted">{{ 'healthConnect.patient.gender' | translate }}</span>
              <select
                class="hpd-focusable rounded-hpd-sm border border-hpd-border bg-white py-2 pl-3 pr-8 text-sm shadow-hpd-sm"
                [ngModel]="gender() ?? ''"
                (ngModelChange)="setGender($event)"
              >
                <option value="">{{ 'healthConnect.patient.allGenders' | translate }}</option>
                <option value="female">{{ 'healthConnect.stats.female' | translate }}</option>
                <option value="male">{{ 'healthConnect.stats.male' | translate }}</option>
                <option value="unspecified">{{ 'healthConnect.stats.unspecified' | translate }}</option>
              </select>
            </label>

            <label class="flex items-center gap-2 pb-2 text-sm text-hpd-muted">
              <input
                class="hpd-focusable h-4 w-4 rounded accent-hpd-primary"
                type="checkbox"
                [checked]="childrenOnly()"
                (change)="setChildrenOnly($any($event.target).checked)"
              />
              <span>{{ 'healthConnect.patient.childrenOnly' | translate }}</span>
            </label>

            <div class="w-full max-w-xs">
              <hpd-search-input
                labelKey="healthConnect.patient.search"
                [value]="query()"
                [debounceMs]="300"
                (searchChange)="setSearch($event)"
              />
            </div>
          </div>
        </div>

        <!--
          What this read was refused, said differently for each part because the two cost different
          things. caseAssignments is the louder of the two and comes first: it says the list in
          front of the clinician is short, which nothing inside the list could say. lastActivity is
          a quiet note about one column, and the column itself carries the marker.

          Both are absent whenever the header is, which is five of the eight disciplines.
        -->
        @if (restricted('caseAssignments')) {
          <p
            class="mb-4 flex items-start gap-2 rounded-hpd-sm bg-hpd-warning-tint px-4 py-3 text-sm text-hpd-warning"
            role="status"
            data-cy="restrictedCaseAssignments"
          >
            <mat-icon class="!h-5 !w-5 shrink-0 !text-[20px]" aria-hidden="true">report_problem</mat-icon>
            <span>{{ 'healthConnect.patient.restricted.caseAssignments' | translate }}</span>
          </p>
        }
        @if (restricted('lastActivity')) {
          <p
            class="mb-4 flex items-start gap-2 rounded-hpd-sm border border-hpd-border bg-hpd-cream px-4 py-3 text-sm text-hpd-muted"
            role="status"
            data-cy="restrictedLastActivity"
          >
            <mat-icon class="!h-5 !w-5 shrink-0 !text-[20px]" aria-hidden="true">visibility_off</mat-icon>
            <span>{{ 'healthConnect.patient.restricted.lastActivity' | translate }}</span>
          </p>
        }

        <hpd-async-state [status]="repository.asyncState().status" [empty]="directoryPage().totalItems === 0" (retry)="repository.reset()">
          <hpd-data-table
            [columns]="columns()"
            [rows]="directoryPage().items"
            [actions]="actions"
            [trackBy]="trackById"
            (actionTriggered)="handleAction($event)"
          />
          <hpd-pagination [totalPages]="directoryPage().totalPages" [initialPage]="directoryPage().page" (pageChange)="setPage($event)" />
        </hpd-async-state>
      </div>
    </main>

    <!--
      The patient-record overlay renders here. Fixed-positioned, so it covers the viewport rather
      than trailing this page — and as a child route it leaves the directory above mounted, with
      its search, filters, page number and scroll position untouched while a record is open.
    -->
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PatientDirectoryPageComponent {
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly query = computed(() => this.queryParams().get('q') ?? '');
  readonly gender = computed<PatientSex | undefined>(() => {
    const value = this.queryParams().get('gender');
    return isPatientSex(value) ? value : undefined;
  });
  readonly childrenOnly = computed(() => this.queryParams().get('children') === 'true');
  readonly page = computed(() => {
    const parsed = Number(this.queryParams().get('page'));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  });
  readonly directoryPage = computed(() =>
    this.repository.filterPatients(
      this.query(),
      { page: this.page(), pageSize: DIRECTORY_PAGE_SIZE },
      {
        gender: this.gender(),
        childrenOnly: this.childrenOnly(),
      },
    ),
  );

  /**
   * A `computed` rather than a plain array **so the activity column can change what it says.**
   *
   * <p>`<hpd-data-table>` is `OnPush` over `@Input()`s, so a closure that quietly started reading a
   * signal would keep rendering the previous text until the `rows` reference happened to change.
   * Recomputing the array gives the table a new `columns` reference, which is the only thing it
   * watches.
   */
  readonly columns = computed<readonly DataTableColumn<PatientListRow>[]>(() => [
    { id: 'name', labelKey: 'healthConnect.patient.patient', value: patient => patient.patientName },
    {
      id: 'gender',
      labelKey: 'healthConnect.patient.gender',
      value: patient => this.translate.instant(`healthConnect.stats.${patient.sex}`),
    },
    {
      id: 'activity',
      labelKey: 'healthConnect.patient.lastActivity',
      // Three states, and the whole of backlog item 114 is that the first two stopped being one.
      //
      // A marker when the activity log was refused: every row is present and every one of them has
      // a null date, so saying it per row is honest here — unlike `caseAssignments`, where the
      // rows that would carry the marker are the ones that are not there.
      //
      // An em dash when the read succeeded and this patient has simply never been seen. Guarded,
      // and an em dash rather than a blank: the same shape the review queue already uses for its
      // nullable date. Unguarded this threw once per patient who had never been seen, and took
      // their row off the table with it.
      value: patient =>
        this.restricted('lastActivity')
          ? this.translate.instant('healthConnect.patient.restricted.lastActivityCell')
          : patient.lastActivityAt?.slice(0, 10) ?? '—',
    },
  ]);
  readonly actions: readonly DataTableAction<PatientListRow>[] = [
    { id: 'view', labelKey: 'healthConnect.actions.view', icon: 'visibility' },
  ];
  readonly trackById = (patient: PatientListRow): string => patient.id;

  /**
   * Whether this directory read was refused one named part.
   *
   * <p>Asked per part rather than rendered by looping the array, because each part has its own
   * sentence and its own treatment — and because a token this bundle does not recognise never
   * reaches here: {@link parseRestrictedParts} drops it, so nothing can ask for a catalogue key
   * that does not exist. It is a question about *this read*, not about the caller's discipline; see
   * `api/restricted-parts.ts` for why the two are not the same.
   */
  restricted(part: RestrictedPart): boolean {
    return this.repository.directoryRestrictions().includes(part);
  }

  setSearch(query: string): void {
    this.navigate({ query, page: 1 });
  }

  setGender(value: string): void {
    this.navigate({ gender: isPatientSex(value) ? value : undefined, page: 1 });
  }

  setChildrenOnly(childrenOnly: boolean): void {
    this.navigate({ childrenOnly, page: 1 });
  }

  setPage(page: number): void {
    this.navigate({ page });
  }

  handleAction(event: DataTableActionEvent<PatientListRow>): void {
    if (event.actionId === 'view') {
      // preserve: the search text, gender filter, children-only flag and page number are all in
      // the query string, and the directory keeps rendering from them beneath the record overlay.
      // Without this, opening a record reset the list to page 1 unfiltered.
      void this.router.navigate(['/patients', event.row.id], { queryParamsHandling: 'preserve' });
    }
  }

  private navigate(changes: Partial<{ query: string; gender: PatientSex | undefined; childrenOnly: boolean; page: number }>): void {
    const state = {
      query: changes.query ?? this.query(),
      gender: changes.gender === undefined && 'gender' in changes ? undefined : changes.gender ?? this.gender(),
      childrenOnly: changes.childrenOnly ?? this.childrenOnly(),
      page: changes.page ?? this.page(),
    };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: state.query || null,
        gender: state.gender ?? null,
        children: state.childrenOnly ? 'true' : null,
        page: state.page > 1 ? state.page : null,
      },
    });
  }
}
