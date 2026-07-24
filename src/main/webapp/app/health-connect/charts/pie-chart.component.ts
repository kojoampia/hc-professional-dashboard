import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { PieChartSegment } from '../health-connect.models';
import { toDoughnutChartData } from './chart-transforms';

@Component({
  standalone: true,
  selector: 'hpd-pie-chart',
  imports: [BaseChartDirective, TranslateModule],
  template: `
    <figure
      class="hpd-focusable m-0 flex h-[600px] max-h-[600px] min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="descriptionId"
    >
      <figcaption class="mb-4">
        <h2 [id]="titleId" class="font-semibold text-slate-900">{{ titleKey() | translate }}</h2>
        <p [id]="descriptionId" class="sr-only">{{ descriptionKey() | translate }}</p>
      </figcaption>
      <div role="img" [attr.aria-labelledby]="titleId" [attr.aria-describedby]="descriptionId" class="relative min-h-[16rem] flex-1">
        <canvas baseChart type="doughnut" [data]="data()" [options]="options()"></canvas>
      </div>
    </figure>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PieChartComponent {
  readonly segments = input<readonly PieChartSegment[]>([]);
  readonly titleKey = input.required<string>();
  readonly descriptionKey = input.required<string>();
  readonly legendKey = input.required<string>();
  readonly titleId = 'hpd-case-distribution-title';
  readonly descriptionId = 'hpd-case-distribution-description';

  private readonly translate = inject(TranslateService);
  readonly data = computed(() =>
    toDoughnutChartData(this.segments(), segment => this.translate.instant(`healthConnect.stats.${segment.label}`)),
  );
  readonly options = computed<ChartConfiguration<'doughnut'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: true, position: 'bottom', title: { display: true, text: this.translate.instant(this.legendKey()) } },
    },
  }));
}
