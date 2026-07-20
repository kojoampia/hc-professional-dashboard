import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LineChartPoint } from '../health-connect.models';
import { toLineChartSeries } from './chart-transforms';

@Component({
  standalone: true,
  selector: 'hpd-line-chart',
  imports: [NgxChartsModule, TranslateModule],
  template: `
    <figure class="hpd-chart-card" [attr.aria-labelledby]="titleId" [attr.aria-describedby]="descriptionId">
      <figcaption>
        <h2 [id]="titleId">{{ titleKey() | translate }}</h2>
        <p [id]="descriptionId">{{ descriptionKey() | translate }}</p>
      </figcaption>
      <div role="img" [attr.aria-labelledby]="titleId" [attr.aria-describedby]="descriptionId">
        <ngx-charts-line-chart
          [results]="results()"
          [legend]="true"
          [legendTitle]="legendKey() | translate"
          [xAxis]="true"
          [yAxis]="true"
          [showXAxisLabel]="true"
          [showYAxisLabel]="true"
          [xAxisLabel]="xAxisKey() | translate"
          [yAxisLabel]="yAxisKey() | translate"
          [tooltipDisabled]="false"
        />
      </div>
    </figure>
  `,
  styles: `
    .hpd-chart-card {
      min-width: 0;
      margin: 0;
      padding: 1rem;
      border: 1px solid var(--hpd-color-shell-border);
      border-radius: 0.75rem;
      background: var(--hpd-color-surface);
    }
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
  readonly results = computed(() => toLineChartSeries(this.points(), this.translate.instant(this.legendKey())));
}
