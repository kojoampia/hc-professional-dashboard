import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import GroupedBarChartComponent from '../charts/grouped-bar-chart.component';
import LineChartComponent from '../charts/line-chart.component';
import PieChartComponent from '../charts/pie-chart.component';
import { CaseStatus } from '../health-connect.models';
import StatCardRowComponent, { StatCard } from '../../shared/health-connect/stat-card/stat-card-row.component';
import AsyncStateComponent from '../../shared/health-connect/async-state/async-state.component';

@Component({
  standalone: true,
  selector: 'hpd-dashboard-page',
  imports: [AsyncStateComponent, GroupedBarChartComponent, LineChartComponent, PieChartComponent, StatCardRowComponent, TranslateModule],
  template: `
    <main class="hpd-container py-4">
      <h1>{{ 'healthConnect.navigation.dashboard' | translate }}</h1>

      <section aria-labelledby="hpd-dashboard-demographics">
        <h2 id="hpd-dashboard-demographics">{{ 'healthConnect.dashboard.demographics' | translate }}</h2>
        <hpd-stat-card-row [cards]="demographicCards()" (selected)="navigateDemographic($event)" />
      </section>

      <section aria-labelledby="hpd-dashboard-case-status">
        <h2 id="hpd-dashboard-case-status">{{ 'healthConnect.dashboard.caseStatus' | translate }}</h2>
        <hpd-stat-card-row [cards]="caseCards()" (selected)="navigateCaseStatus($event)" />
      </section>

      <hpd-async-state [status]="repository.asyncState().status" [empty]="false" (retry)="repository.reset()">
        <section class="hpd-dashboard-charts" [attr.aria-label]="'healthConnect.dashboard.charts.title' | translate">
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
  styles: `
    section + section {
      margin-top: 2rem;
    }
    .hpd-dashboard-charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardPageComponent {
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  private readonly router = inject(Router);

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
