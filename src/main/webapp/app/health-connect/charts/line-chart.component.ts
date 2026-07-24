import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LineChartPoint } from '../health-connect.models';
import { toLineChartData } from './chart-transforms';

@Component({
  standalone: true,
  selector: 'hpd-line-chart',
  imports: [BaseChartDirective, TranslateModule],
  template: `
    <figure
      class="hpd-focusable m-0 flex h-full min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="descriptionId"
    >
      <figcaption class="mb-4">
        <h2 [id]="titleId" class="font-semibold text-slate-900">{{ titleKey() | translate }}</h2>
        <p [id]="descriptionId" class="sr-only">{{ descriptionKey() | translate }}</p>
      </figcaption>
      <div role="img" [attr.aria-labelledby]="titleId" [attr.aria-describedby]="descriptionId" class="relative min-h-[16rem] flex-1">
        <canvas baseChart type="line" [data]="data()" [options]="options()"></canvas>
      </div>
    </figure>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LineChartComponent {
  readonly points = input<readonly LineChartPoint[]>([]);
  readonly titleKey = input.required<string>();
  readonly descriptionKey = input.required<string>();
  readonly legendKey = input.required<string>();
  readonly xAxisKey = input.required<string>();
  readonly yAxisKey = input.required<string>();
  readonly titleId = 'hpd-case-timeline-title';
  readonly descriptionId = 'hpd-case-timeline-description';

  private readonly translate = inject(TranslateService);
  readonly data = computed(() => toLineChartData(this.points(), this.translate.instant(this.legendKey())));
  readonly options = computed<ChartConfiguration<'line'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom' } },
    scales: {
      x: { title: { display: true, text: this.translate.instant(this.xAxisKey()) }, grid: { display: false } },
      y: { title: { display: true, text: this.translate.instant(this.yAxisKey()) }, beginAtZero: true },
    },
  }));
}
