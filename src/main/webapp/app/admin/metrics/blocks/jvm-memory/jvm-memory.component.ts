import { Component, Input } from '@angular/core';

import SharedModule from 'app/shared/shared.module';
import ProgressBarComponent from 'app/shared/progress-bar/progress-bar.component';
import { JvmMetrics } from 'app/admin/metrics/metrics.model';

@Component({
  selector: 'hpd-jvm-memory',
  templateUrl: './jvm-memory.component.html',
  imports: [SharedModule, ProgressBarComponent],
})
export class JvmMemoryComponent {
  /**
   * object containing all jvm memory metrics
   */
  @Input() jvmMemoryMetrics?: { [key: string]: JvmMetrics };

  /**
   * boolean field saying if the metrics are in the process of being updated
   */
  @Input() updating?: boolean;
}
