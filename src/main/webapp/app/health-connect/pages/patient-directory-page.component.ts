import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import { RestrictedFollowUp, RestrictedPart } from '../api/restricted-parts';
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
          <!--
            What happens when the clinician acts, which is neither of the statements above.

            Those two are about the list: rows are missing, this column is blank. This one is about
            every row that IS here — each is real, complete and unopenable, and the eye action has
            been withdrawn to match (see the actions computed below). It is placed here, in the
            table's own frame and immediately above it, rather than stacked with the other two at
            the top of the card: it explains a missing affordance rather than missing data, and a
            technician is sent all three at once.

            INSIDE hpd-async-state ON PURPOSE, AND THAT PLACEMENT IS THE EMPTY-PAGE RULE.
            api/'s item 128 sends the marker to a technician with no tasks at all, on a zero-row
            page, deliberately — suppressing it there would make the wire value depend on caseload,
            and mobile/ caches the restricted set beside page zero, so the marker would appear and
            vanish as shifts were assigned. Suppressing it is therefore the client's job, and the
            rule handed down is: key it on having rows to describe. Content projected here renders
            only when the state is ready and the page is not empty, so an empty, errored or loading
            directory shows its own panel and this sentence is not printed over nothing. An explicit
            items.length check beside the condition would be dead code that a passing test appeared
            to cover — the shape item 126 found on the record path and removed.
          -->
          @if (followUpRestricted('record')) {
            <p
              class="mb-4 flex items-start gap-2 rounded-hpd-sm border border-hpd-danger/25 bg-hpd-danger-tint px-4 py-3 text-sm text-hpd-danger"
              role="status"
              data-cy="restrictedFollowUpRecord"
            >
              <mat-icon class="!h-5 !w-5 shrink-0 !text-[20px]" aria-hidden="true">block</mat-icon>
              <span>{{ 'healthConnect.patient.restrictedFollowUps.record' | translate }}</span>
            </p>
          }

          <hpd-data-table
            [columns]="columns()"
            [rows]="directoryPage().items"
            [actions]="actions()"
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
  /**
   * The eye, unless the read said the record behind every row will refuse — in which case there is
   * no action to offer.
   *
   * <p><b>Withdrawn rather than left to fail.</b> Item 132's whole subject is a clinician learning
   * by tapping, and a sentence saying the record will not open printed beside a button that opens it
   * is a screen arguing with itself — the button being the half they act on. `api/` states the
   * marker is never wrong when present, so nothing that would have worked is taken away.
   *
   * <p><b>`mobile/` reached the same behaviour by a different route, and the difference is worth
   * stating so the agreement is a decision rather than a coincidence.</b> There the row <em>is</em>
   * the affordance — an `ion-item` — so it had to disable the control <em>and</em> guard the
   * handler, because Ionic delivers a click to a plain item either way and a target that depresses
   * and does nothing is what a hung app looks like. Here the row is an inert `<tr>`:
   * `<hpd-data-table>` puts no handler on it, and the only way into a record is this eye button in
   * the action cell. So the honest move is <b>not to render it</b>, which is strictly better than
   * disabling — nothing is left focusable, so there is no dead target and no `aria-disabled` needed
   * to explain one. The action column's header cell goes with it, since the table renders both under
   * `actions.length`, leaving nothing that suggests there is something to do.
   *
   * <p><b>The row was never a link, so no link affordance is lost.</b> Middle-click, open-in-new-tab
   * and copy-address are the usual reasons to prefer an anchor, and they would argue against
   * suppressing one — but they do not arise: this has always been a `<button type="button">` calling
   * `Router.navigate`, and there is no `<a href>` in the table to take away. Were the directory ever
   * rebuilt out of real links, this decision would have to be made again rather than carried over.
   *
   * <p><b>Not a guard, and must not be read as one.</b> The record path refuses on its own account;
   * this only stops offering a door that is locked. The route is still reachable by URL and still
   * answers 503, which is correct — a client-side affordance is not an authorisation decision. It is
   * also why {@link handleAction} gains <b>no</b> matching check: with no button rendered nothing can
   * emit the event, so a guard there would be unreachable code that a passing test appeared to cover
   * — the exact shape item 126 found on the record path and deleted.
   *
   * <p><b>The whole column, not `isAvailable` per row.</b> `X-Restricted-Follow-Ups` is a fact about
   * the read and the same fact for every row in it, exactly as `caseAssignments` is — item 114's
   * reason for answering that one above the list rather than on a row. A per-row predicate would
   * encode a per-row judgement the header does not make, and would leave an empty actions column
   * under a header suggesting there was something to do.
   *
   * <p>A `computed` for {@link columns}' reason: `<hpd-data-table>` is `OnPush` over `@Input()`s, so
   * a plain array mutated in place would keep rendering the previous state.
   */
  readonly actions = computed<readonly DataTableAction<PatientListRow>[]>(() =>
    this.followUpRestricted('record') ? [] : [{ id: 'view', labelKey: 'healthConnect.actions.view', icon: 'visibility' }],
  );
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

  /**
   * Whether this directory read said a named follow-up read will refuse.
   *
   * <p>Beside {@link restricted} and not derived from it: the two headers answer different
   * questions, and a pharmacist is the proof — refused `lastActivity` on the list and served records
   * perfectly well. Inferring one from the other would withdraw a working link from a clinician
   * whose only loss was a column.
   *
   * <p>Asked per follow-up for {@link restricted}'s reason: a token this bundle does not recognise
   * never reaches here, so nothing can ask for a catalogue key that does not exist, and nothing is
   * withdrawn over a refusal this code cannot explain.
   */
  followUpRestricted(followUp: RestrictedFollowUp): boolean {
    return this.repository.directoryRestrictedFollowUps().includes(followUp);
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
