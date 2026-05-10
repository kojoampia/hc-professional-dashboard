import { Component, Input } from '@angular/core';
import { LegendPosition, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { IChartItem } from './chart-item-model';
import { StatusService } from './status.service';

@Component({
  selector: 'jhi-status',
  standalone: true,
  imports: [NgxChartsModule],
  templateUrl: './status.component.html',
  styleUrl: './status.component.scss',
})
export class StatusComponent {
  /* Chart title */
  @Input() chartTitle = 'Tasks: Last 7 Days';

  /* Chart data : Bar Chart */
  chartItems: IChartItem[] = [];

  /* Chart data : Line Chart */
  chartSeries: IChartItem[] = [];

  /* Dimensions of chart [width,height]. When undefined takes the size of parent container  */
  @Input() view = [];

  /* The color scheme of the chart */
  @Input() colorScheme = {
    name: 'default',
    selectable: true,
    group: ScaleType.Linear,
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA', '#A4A528', '#C0F12F', '#010101'],
  };

  /* The color scale type. Can be either 'ordinal' or 'linear' */
  @Input() schemeType = ScaleType.Ordinal;

  /* Enables animations */
  @Input() animations = true;

  /* Show or hide the legend */
  @Input() showLegend = true;

  /* Legend title */
  @Input() legendTitle = 'Legend';

  /* Legend position. Can be either 'right' or 'bottom' */
  @Input() legendPosition = LegendPosition.Right;

  /* Show or hide the x axis */
  @Input() showXAxis = true;

  /* Show or hide the y axis */
  @Input() showYAxis = true;

  /* Show or hide the grid lines */
  @Input() showGridLines = true;

  /* Show or hide the x axis label */
  @Input() showXAxisLabel = true;

  /* Show or hide the y axis label */
  @Input() showYAxisLabel = true;

  /* The x axis label text */
  @Input() xAxisLabel = 'Patient';

  /* The x axis label text */
  @Input() yAxisLabel = 'Hours';

  /* Show value number next to the bar */
  @Input() showDataLabel = true;

  /* Hide bar if value is 0 and setting is true */
  @Input() noBarWhenZero = true;

  /* Fill elements with a gradient */
  @Input() gradient = true;

  /* Round edges for the bars */
  @Input() roundEdges = true;

  /* Padding between bars in px */
  @Input() barPadding = 8;

  /* Display TimeLine */
  @Input() showTimeline = true;

  constructor(private statusService: StatusService) {
    this.chartItems = this.statusService.getServicesItems();
    this.chartSeries = this.statusService.getServiceSeries();
  }

  /* On component initialization function*/
  ngOnInit(): void {}

  /* Click event */
  onSelect(): void {
    // Enter code here
  }

  /* Element activation event (mouse enter)*/
  onActivate(): void {
    // Enter code here
  }

  /* Element activation event (mouse enter)*/
  onDeactivate(): void {
    // Enter code here
  }
}
