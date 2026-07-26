import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GroupedBarChartGroup } from '../health-connect.models';
import { toGroupedBarChartData } from './chart-transforms';

@Component({
  standalone: true,
  selector: 'hpd-grouped-bar-chart',
  imports: [BaseChartDirective, TranslateModule],
  template: `
    <figure
      class="hpd-focusable m-0 flex h-[600px] max-h-[600px] w-full min-w-0 flex-col rounded-hpd border border-hpd-border bg-white p-[18px] shadow-hpd-sm"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="descriptionId"
    >
      <figcaption class="mb-2.5">
        <h2 [id]="titleId" class="m-0 text-xs font-bold uppercase tracking-wider text-hpd-muted">{{ titleKey() | translate }}</h2>
        <p [id]="descriptionId" class="sr-only">{{ descriptionKey() | translate }}</p>
      </figcaption>
      <div role="img" [attr.aria-labelledby]="titleId" [attr.aria-describedby]="descriptionId" class="relative min-h-0 flex-1">
        <canvas baseChart type="bar" [data]="data()" [options]="options()"></canvas>
      </div>
    </figure>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GroupedBarChartComponent {
  readonly groups = input<readonly GroupedBarChartGroup[]>([]);
  readonly titleKey = input.required<string>();
  readonly descriptionKey = input.required<string>();
  readonly legendKey = input.required<string>();
  readonly xAxisKey = input.required<string>();
  readonly yAxisKey = input.required<string>();
  readonly titleId = 'hpd-cases-by-patient-title';
  readonly descriptionId = 'hpd-cases-by-patient-description';

  private readonly translate = inject(TranslateService);
  readonly data = computed(() =>
    toGroupedBarChartData(this.groups(), label => this.translate.instant(`healthConnect.dashboard.charts.${label}`)),
  );
  readonly options = computed<ChartConfiguration<'bar'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom', title: { display: true, text: this.translate.instant(this.legendKey()) } } },
    scales: {
      x: { title: { display: true, text: this.translate.instant(this.xAxisKey()) }, grid: { display: false } },
      y: { title: { display: true, text: this.translate.instant(this.yAxisKey()) }, beginAtZero: true, ticks: { precision: 0 } },
    },
  }));
}
