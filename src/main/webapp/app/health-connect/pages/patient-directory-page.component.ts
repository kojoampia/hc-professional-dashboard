import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
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
  imports: [AsyncStateComponent, DataTableComponent, FormsModule, PaginationComponent, SearchInputComponent, TranslateModule],
  template: `
    <main class="hpd-container py-4">
      <h1>{{ 'healthConnect.patient.directory' | translate }}</h1>

      <section class="hpd-directory-controls" [attr.aria-label]="'healthConnect.patient.filters' | translate">
        <hpd-search-input labelKey="healthConnect.patient.search" [value]="query()" [debounceMs]="300" (searchChange)="setSearch($event)" />

        <label>
          <span>{{ 'healthConnect.patient.gender' | translate }}</span>
          <select class="form-select hpd-focusable" [ngModel]="gender() ?? ''" (ngModelChange)="setGender($event)">
            <option value="">{{ 'healthConnect.patient.allGenders' | translate }}</option>
            <option value="female">{{ 'healthConnect.stats.female' | translate }}</option>
            <option value="male">{{ 'healthConnect.stats.male' | translate }}</option>
            <option value="unspecified">{{ 'healthConnect.stats.unspecified' | translate }}</option>
          </select>
        </label>

        <label class="form-check">
          <input
            class="form-check-input hpd-focusable"
            type="checkbox"
            [checked]="childrenOnly()"
            (change)="setChildrenOnly($any($event.target).checked)"
          />
          <span class="form-check-label">{{ 'healthConnect.patient.childrenOnly' | translate }}</span>
        </label>
      </section>

      <hpd-async-state [status]="repository.asyncState().status" [empty]="directoryPage().totalItems === 0" (retry)="repository.reset()">
        <hpd-data-table
          [columns]="columns"
          [rows]="directoryPage().items"
          [actions]="actions"
          [trackBy]="trackById"
          (actionTriggered)="handleAction($event)"
        />
        <hpd-pagination [totalPages]="directoryPage().totalPages" [initialPage]="directoryPage().page" (pageChange)="setPage($event)" />
      </hpd-async-state>
    </main>
  `,
  styles: `
    .hpd-directory-controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      align-items: end;
      gap: 1rem;
      margin-block: 1.5rem;
    }
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

  readonly columns: readonly DataTableColumn<PatientListRow>[] = [
    { id: 'name', labelKey: 'healthConnect.patient.patient', value: patient => patient.patientName },
    {
      id: 'gender',
      labelKey: 'healthConnect.patient.gender',
      value: patient => this.translate.instant(`healthConnect.stats.${patient.sex}`),
    },
    { id: 'activity', labelKey: 'healthConnect.patient.lastActivity', value: patient => patient.lastActivityAt.slice(0, 10) },
  ];
  readonly actions: readonly DataTableAction<PatientListRow>[] = [{ id: 'view', labelKey: 'healthConnect.actions.view', icon: '👁' }];
  readonly trackById = (patient: PatientListRow): string => patient.id;

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
      void this.router.navigate(['/patients', event.row.id]);
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
