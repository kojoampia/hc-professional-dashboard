import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricPanelComponent } from './metric-panel.component';
import { MetricPanelService } from './metric-panel.service';
import { NgxChartsModule } from '@swimlane/ngx-charts';

@NgModule({
  imports: [CommonModule, NgxChartsModule, MetricPanelComponent],
  exports: [MetricPanelComponent],
  providers: [MetricPanelService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MetricPanelModule {}
