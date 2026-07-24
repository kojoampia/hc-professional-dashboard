import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import SharedModule from 'app/shared/shared.module';
import ProgressBarComponent from 'app/shared/progress-bar/progress-bar.component';
import { HttpServerRequests } from 'app/admin/metrics/metrics.model';
import { filterNaN } from 'app/core/util/operators';

@Component({
  selector: 'hpd-metrics-request',
  templateUrl: './metrics-request.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SharedModule, ProgressBarComponent],
})
export class MetricsRequestComponent {
  /**
   * object containing http request related metrics
   */
  @Input() requestMetrics?: HttpServerRequests;

  /**
   * boolean field saying if the metrics are in the process of being updated
   */
  @Input() updating?: boolean;

  filterNaN = (input: number): number => filterNaN(input);
}
