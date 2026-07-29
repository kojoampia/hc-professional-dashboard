import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import DataTableComponent, {
  DataTableAction,
  DataTableActionEvent,
  DataTableColumn,
} from '../../shared/health-connect/data-table/data-table.component';
import { OnboardingApiService, OnboardingApplicationDto, OnboardingStatus } from '../api/onboarding-api.service';

const FILTERS: (OnboardingStatus | 'ALL')[] = ['CREDENTIAL_REVIEW', 'RETURNED_FOR_CORRECTION', 'APPROVED', 'ACTIVE', 'ALL'];

/**
 * Reviewer/admin queue of onboarding applications (WP5), including the
 * careers attribution source column (handoff contract §3).
 */
@Component({
  standalone: true,
  selector: 'hpd-review-queue-page',
  imports: [DataTableComponent, TranslateModule],
  template: `
    <main class="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 class="sr-only">{{ 'healthConnect.review.title' | translate }}</h1>

      <div class="mb-4 flex flex-wrap gap-2" role="group" [attr.aria-label]="'healthConnect.review.filter' | translate">
        @for (filter of filters; track filter) {
          <button
            class="hpd-focusable cursor-pointer rounded-full border-[1.5px] px-4 py-1.5 text-[12.5px] font-bold transition-colors"
            [class]="
              activeFilter() === filter ? 'border-hpd-primary bg-[#e7eef6] text-hpd-primary' : 'border-hpd-border bg-white text-hpd-muted'
            "
            type="button"
            [attr.data-cy]="'filter-' + filter"
            (click)="setFilter(filter)"
          >
            {{ (filter === 'ALL' ? 'healthConnect.review.all' : 'healthConnect.onboarding.statuses.' + filter) | translate }}
          </button>
        }
      </div>

      <div class="rounded-hpd border border-hpd-border bg-white p-6 shadow-hpd-sm">
        @if (loading()) {
          <p class="py-6 text-center text-hpd-muted">{{ 'healthConnect.states.loading' | translate }}</p>
        } @else {
          <hpd-data-table
            [columns]="columns"
            [rows]="applications()"
            [actions]="actions"
            [trackBy]="trackById"
            emptyKey="healthConnect.review.empty"
            tableLabelKey="healthConnect.review.title"
            (actionTriggered)="open($event)"
          />
        }
      </div>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReviewQueuePageComponent implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly filters = FILTERS;
  readonly activeFilter = signal<OnboardingStatus | 'ALL'>('CREDENTIAL_REVIEW');
  readonly applications = signal<OnboardingApplicationDto[]>([]);
  readonly loading = signal(true);

  readonly columns: readonly DataTableColumn<OnboardingApplicationDto>[] = [
    { id: 'login', labelKey: 'healthConnect.review.applicant', value: row => row.login ?? row.accountId },
    {
      id: 'role',
      labelKey: 'healthConnect.onboarding.requestedRole',
      value: row =>
        row.requestedRole ? this.translate.instant('healthConnect.roles.' + row.requestedRole.replace('ROLE_', '').toLowerCase()) : '—',
    },
    {
      id: 'status',
      labelKey: 'healthConnect.case.status',
      value: row => this.translate.instant('healthConnect.onboarding.statuses.' + row.status),
    },
    // careers handoff contract §3: attribution must be visible where applications are reviewed
    { id: 'source', labelKey: 'healthConnect.review.source', value: row => row.source ?? '—' },
    { id: 'submitted', labelKey: 'healthConnect.review.submitted', value: row => row.submittedAt?.slice(0, 10) ?? '—' },
  ];

  readonly actions: readonly DataTableAction<OnboardingApplicationDto>[] = [
    { id: 'open', labelKey: 'healthConnect.review.open', icon: 'rate_review' },
  ];

  readonly trackById = (row: OnboardingApplicationDto): string => row.id;

  ngOnInit(): void {
    this.load();
  }

  setFilter(filter: OnboardingStatus | 'ALL'): void {
    this.activeFilter.set(filter);
    this.load();
  }

  open(event: DataTableActionEvent<OnboardingApplicationDto>): void {
    void this.router.navigate(['/review', event.row.id]);
  }

  private load(): void {
    this.loading.set(true);
    const filter = this.activeFilter();
    this.api.listApplications(filter === 'ALL' ? undefined : filter).subscribe({
      next: applications => {
        this.applications.set(applications);
        this.loading.set(false);
      },
      error: () => {
        this.applications.set([]);
        this.loading.set(false);
      },
    });
  }
}
