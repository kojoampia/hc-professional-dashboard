import { Component, Input } from '@angular/core';

import SharedModule from 'app/shared/shared.module';
import ProgressBarComponent from 'app/shared/progress-bar/progress-bar.component';
import { GarbageCollector } from 'app/admin/metrics/metrics.model';

@Component({
  selector: 'hpd-metrics-garbagecollector',
  templateUrl: './metrics-garbagecollector.component.html',
  imports: [SharedModule, ProgressBarComponent],
})
export class MetricsGarbageCollectorComponent {
  /**
   * object containing garbage collector related metrics
   */
  @Input() garbageCollectorMetrics?: GarbageCollector;

  /**
   * boolean field saying if the metrics are in the process of being updated
   */
  @Input() updating?: boolean;
}
