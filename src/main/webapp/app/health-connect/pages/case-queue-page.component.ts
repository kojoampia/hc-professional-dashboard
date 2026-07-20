import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';

import { hasHealthConnectPermission } from '../authority-role';
import { CaseQueueRow, CaseStatus, RosterScope } from '../health-connect.models';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import AsyncStateComponent from '../../shared/health-connect/async-state/async-state.component';
import DataTableComponent, {
  DataTableAction,
  DataTableActionEvent,
  DataTableColumn,
} from '../../shared/health-connect/data-table/data-table.component';
import StatCardRowComponent, { StatCard } from '../../shared/health-connect/stat-card/stat-card-row.component';

const isCaseStatus = (value: string | null): value is CaseStatus => value === 'urgent' || value === 'open' || value === 'closed';
const isRosterScope = (value: string | null): value is RosterScope => value === 'all' || value === 'mine';

@Component({
  standalone: true,
  selector: 'hpd-case-queue-page',
  imports: [AsyncStateComponent, DataTableComponent, StatCardRowComponent, TranslateModule],
  template: `
    <main class="hpd-container py-4">
      <h1>{{ 'healthConnect.case.queue' | translate }}</h1>

      <hpd-stat-card-row [cards]="statusCards()" [selectedId]="statusFilter() ?? null" (selected)="setStatus($event)" />

      <section class="hpd-case-queue__scope" [attr.aria-label]="'healthConnect.case.scope' | translate">
        <button
          class="hpd-focusable btn btn-outline-primary"
          type="button"
          [attr.aria-pressed]="rosterScope() === 'all'"
          (click)="setScope('all')"
        >
          {{ 'healthConnect.roster.allCases' | translate }}
        </button>
        <button
          class="hpd-focusable btn btn-outline-primary"
          type="button"
          [attr.aria-pressed]="rosterScope() === 'mine'"
          (click)="setScope('mine')"
        >
          {{ 'healthConnect.roster.myRoster' | translate }}
        </button>
      </section>

      <hpd-async-state [status]="repository.asyncState().status" [empty]="rows().length === 0" (retry)="repository.reset()">
        <hpd-data-table
          [columns]="columns"
          [rows]="rows()"
          [actions]="actions"
          [headerVariant]="statusFilter() ?? 'neutral'"
          [statusVariant]="statusVariant"
          [trackBy]="trackById"
          (actionTriggered)="handleAction($event)"
        />
      </hpd-async-state>
    </main>
  `,
  styles: `
    .hpd-case-queue__scope {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-block: 1rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CaseQueuePageComponent {
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly account = inject(AccountService);
  private readonly translate = inject(TranslateService);
  private readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly currentAccount = toSignal(this.account.getAuthenticationState(), { initialValue: null });

  readonly statusFilter = computed<CaseStatus | undefined>(() => {
    const status = this.queryParams().get('status');
    return isCaseStatus(status) ? status : undefined;
  });
  readonly rosterScope = computed<RosterScope>(() => {
    const scope = this.queryParams().get('scope');
    return isRosterScope(scope) ? scope : 'all';
  });
  readonly professionalId = computed(() => {
    const login = this.currentAccount()?.login;
    return login ? this.repository.professionalIdForAccount(login) : null;
  });
  readonly canManageCases = computed(() => hasHealthConnectPermission(this.currentAccount()?.authorities, 'manageCase'));
  readonly rows = computed(() => this.repository.listCases(this.statusFilter(), this.rosterScope(), this.professionalId() ?? undefined));
  readonly statusCards = computed<readonly StatCard[]>(() => {
    const counts = this.repository.caseCounts();
    return (['urgent', 'open', 'closed'] as const).map(status => ({
      id: status,
      labelKey: `healthConnect.stats.${status}`,
      count: counts[status],
      variant: status,
    }));
  });
  readonly columns: readonly DataTableColumn<CaseQueueRow>[] = [
    { id: 'date', labelKey: 'healthConnect.case.date', value: row => row.date.slice(0, 10) },
    { id: 'brief', labelKey: 'healthConnect.case.brief', value: row => row.brief },
    {
      id: 'status',
      labelKey: 'healthConnect.case.status',
      value: row => this.translate.instant(`healthConnect.stats.${row.status}`),
      statusVariant: row => row.status,
    },
  ];
  readonly actions: readonly DataTableAction<CaseQueueRow>[] = [
    { id: 'view', labelKey: 'healthConnect.actions.view', icon: '👁' },
    { id: 'reopen', labelKey: 'healthConnect.actions.reopen', isAvailable: row => row.status === 'closed' && this.canManageCases() },
    { id: 'archive', labelKey: 'healthConnect.actions.archive', isAvailable: row => row.status === 'closed' && this.canManageCases() },
  ];
  readonly statusVariant = (row: CaseQueueRow): CaseStatus => row.status;
  readonly trackById = (row: CaseQueueRow): string => row.id;

  setStatus(status: string): void {
    this.navigate({ status: isCaseStatus(status) ? status : undefined });
  }

  setScope(scope: RosterScope): void {
    this.navigate({ scope });
  }

  handleAction(event: DataTableActionEvent<CaseQueueRow>): void {
    if (event.actionId === 'view') {
      void this.router.navigate(['/cases', event.row.id]);
      return;
    }
    if (!this.canManageCases() || event.row.status !== 'closed') {
      return;
    }
    if (event.actionId === 'reopen') {
      this.repository.updateCase(event.row.id, { status: 'open' });
    } else if (event.actionId === 'archive') {
      this.repository.archiveCase(event.row.id);
    }
  }

  private navigate(changes: Partial<{ status: CaseStatus | undefined; scope: RosterScope }>): void {
    const status = changes.status === undefined && 'status' in changes ? undefined : changes.status ?? this.statusFilter();
    const scope = changes.scope ?? this.rosterScope();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: status ?? null, scope: scope === 'mine' ? scope : null },
    });
  }
}
