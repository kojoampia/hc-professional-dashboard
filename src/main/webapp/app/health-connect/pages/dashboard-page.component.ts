import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import GroupedBarChartComponent from '../charts/grouped-bar-chart.component';
import LineChartComponent from '../charts/line-chart.component';
import PieChartComponent from '../charts/pie-chart.component';
import { CaseStatus } from '../health-connect.models';
import { OnboardingProgressService } from 'app/core/onboarding/onboarding-progress.service';
import { EarningsApiService } from '../api/earnings-api.service';
import { ProfessionalEarningsDto } from '../api/earnings-api.model';
import StatCardRowComponent, { StatCard } from '../../shared/health-connect/stat-card/stat-card-row.component';
import AsyncStateComponent from '../../shared/health-connect/async-state/async-state.component';

/**
 * The beat between landing on the dashboard and being moved to the profile. Long enough that the
 * move reads as deliberate, short enough that nobody starts reading.
 */
const INCOMPLETE_PROFILE_REDIRECT_MS = 2000;

@Component({
  standalone: true,
  selector: 'hpd-dashboard-page',
  imports: [
    AsyncStateComponent,
    GroupedBarChartComponent,
    LineChartComponent,
    PieChartComponent,
    RouterLink,
    StatCardRowComponent,
    TranslateModule,
  ],
  template: `
    <main class="w-full space-y-6 px-4 py-8 md:px-8">
      <h1 class="sr-only">{{ 'healthConnect.navigation.dashboard' | translate }}</h1>

      <section aria-labelledby="hpd-dashboard-demographics">
        <h2 id="hpd-dashboard-demographics" class="sr-only">{{ 'healthConnect.dashboard.demographics' | translate }}</h2>
        <hpd-stat-card-row [cards]="demographicCards()" (selected)="navigateDemographic($event)" />
      </section>

      <section aria-labelledby="hpd-dashboard-case-status">
        <h2 id="hpd-dashboard-case-status" class="sr-only">{{ 'healthConnect.dashboard.caseStatus' | translate }}</h2>
        <hpd-stat-card-row [cards]="caseCards()" [columns]="3" (selected)="navigateCaseStatus($event)" />
      </section>

      <!--
        Absent rather than empty when there is nothing to show. An account with no professional
        record behind it (mid-onboarding) 404s, and adminservice may simply be down — neither is
        worth a broken tile on the dashboard, so the card renders only once there are real figures.
      -->
      @if (earnings(); as summary) {
        <section aria-labelledby="hpd-dashboard-earnings" data-cy="dashboardEarnings">
          <h2 id="hpd-dashboard-earnings" class="sr-only">{{ 'healthConnect.earnings.title' | translate }}</h2>
          <a
            routerLink="/earnings"
            class="hpd-focusable flex flex-wrap items-center justify-between gap-4 rounded-hpd border border-hpd-border bg-white p-4 no-underline shadow-hpd-sm transition-shadow duration-150"
          >
            <span>
              <span class="block text-[11px] font-bold uppercase tracking-wider text-hpd-muted">
                {{ 'healthConnect.earnings.accruedThisPeriod' | translate }}
              </span>
              <span class="mt-1 block text-[26px] font-extrabold leading-none tracking-tight text-hpd-primary-dark">
                {{ money(summary.totalAccrued, summary.currency) }}
              </span>
            </span>
            <span class="text-sm text-hpd-muted">
              {{ 'healthConnect.earnings.shiftsCompletedCount' | translate: { count: summary.shiftsCompleted } }}
            </span>
            <span class="text-sm font-bold text-hpd-primary">{{ 'healthConnect.earnings.viewDetail' | translate }}</span>
          </a>
        </section>
      }

      <hpd-async-state [status]="repository.asyncState().status" [empty]="false" (retry)="repository.reset()">
        <section class="mt-4 grid grid-cols-1 gap-3.5" [attr.aria-label]="'healthConnect.dashboard.charts.title' | translate">
          <hpd-line-chart
            [points]="repository.charts().caseTimeline"
            titleKey="healthConnect.dashboard.caseTime"
            descriptionKey="healthConnect.dashboard.charts.caseTimeDescription"
            legendKey="healthConnect.dashboard.charts.caseSeries"
            xAxisKey="healthConnect.dashboard.charts.date"
            yAxisKey="healthConnect.dashboard.charts.caseCount"
          />
          <hpd-pie-chart
            [segments]="repository.charts().caseDistribution"
            titleKey="healthConnect.dashboard.caseDistribution"
            descriptionKey="healthConnect.dashboard.charts.caseDistributionDescription"
            legendKey="healthConnect.dashboard.charts.statusLegend"
          />
          <hpd-grouped-bar-chart
            [groups]="repository.charts().casesByPatient"
            titleKey="healthConnect.dashboard.casePatient"
            descriptionKey="healthConnect.dashboard.charts.casePatientDescription"
            legendKey="healthConnect.dashboard.charts.caseLegend"
            xAxisKey="healthConnect.patient.patient"
            yAxisKey="healthConnect.dashboard.charts.caseCount"
          />
        </section>
      </hpd-async-state>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardPageComponent implements OnInit {
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  private readonly router = inject(Router);
  private readonly earningsApi = inject(EarningsApiService);
  private readonly translate = inject(TranslateService);
  private readonly progressService = inject(OnboardingProgressService);
  private readonly destroyRef = inject(DestroyRef);

  /** Null until adminservice answers, and left null if it cannot — see the template. */
  readonly earnings = signal<ProfessionalEarningsDto | null>(null);

  ngOnInit(): void {
    // Failure is swallowed on purpose. This is one card on a dashboard whose other panels come
    // from a different stack entirely; a 404 (no professional record yet) or an adminservice
    // outage must not surface as a dashboard-wide error.
    this.earningsApi.ownEarnings({ granularity: 'MONTHLY' }).subscribe({
      next: earnings => this.earnings.set(earnings),
      error: () => this.earnings.set(null),
    });

    this.progressService.load();
    this.scheduleIncompleteProfileRedirect();
  }

  /**
   * Send a clinician with an unfinished profile to it, two seconds after they land here.
   *
   * <p>Two seconds rather than immediately so the dashboard is seen rather than flickered past —
   * being bounced instantly reads as a broken link, whereas a beat of dashboard then a move reads
   * as being taken somewhere.
   *
   * <p>Three conditions guard it, and each has a failure it prevents:
   *
   * <ul>
   *   <li><b>only when the server has answered</b> — {@code complete()} is null until then, and
   *       treating unknown as incomplete would bounce people whose profile is finished;
   *   <li><b>only if still on the dashboard</b> — someone who clicked through in that beat has
   *       chosen where to be, and yanking them away is worse than not nudging at all;
   *   <li><b>cancelled on destroy</b> — otherwise the timer fires against a dead component and
   *       navigates whoever is now on screen.
   * </ul>
   */
  private scheduleIncompleteProfileRedirect(): void {
    const timer = setTimeout(() => {
      if (this.progressService.complete() === false && this.router.url.startsWith('/dashboard')) {
        void this.router.navigate(['/account/profile'], { queryParams: { tab: 'application' } });
      }
    }, INCOMPLETE_PROFILE_REDIRECT_MS);

    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }

  /** Same reasoning as the earnings page: `Intl` directly, because four locales ship. */
  money(amount: number, currency: string | null): string {
    const locale = this.translate.currentLang || 'en';
    return currency
      ? new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
      : new Intl.NumberFormat(locale).format(amount);
  }

  readonly demographicCards = computed<readonly StatCard[]>(() => {
    const patients = this.repository.patientRows();
    return [
      { id: 'patients', labelKey: 'healthConnect.stats.patients', count: patients.length, variant: 'neutral' },
      {
        id: 'female',
        labelKey: 'healthConnect.stats.female',
        count: patients.filter(patient => patient.sex === 'female').length,
        variant: 'neutral',
      },
      {
        id: 'male',
        labelKey: 'healthConnect.stats.male',
        count: patients.filter(patient => patient.sex === 'male').length,
        variant: 'neutral',
      },
      { id: 'kids', labelKey: 'healthConnect.stats.kids', count: patients.filter(patient => patient.isChild).length, variant: 'neutral' },
    ];
  });

  readonly caseCards = computed<readonly StatCard[]>(() => {
    const counts = this.repository.caseCounts();
    return (['urgent', 'open', 'closed'] as const).map(status => ({
      id: status,
      labelKey: `healthConnect.stats.${status}`,
      count: counts[status],
      variant: status,
    }));
  });

  navigateDemographic(id: string): void {
    const queryParams = id === 'female' || id === 'male' ? { gender: id } : id === 'kids' ? { children: 'true' } : undefined;
    void this.router.navigate(['/patients'], { queryParams });
  }

  navigateCaseStatus(status: string): void {
    void this.router.navigate(['/cases'], { queryParams: { status: status as CaseStatus } });
  }
}
