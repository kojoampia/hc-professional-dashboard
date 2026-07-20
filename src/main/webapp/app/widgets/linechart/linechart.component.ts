import { OnInit, Component, Input, EventEmitter, Output, TemplateRef } from '@angular/core';
import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';

@Component({
  selector: 'jhi-linechart',
  templateUrl: './linechart.component.html',
  styleUrls: ['./linechart.component.scss'],
  imports: [NgxChartsModule],
})
export class LineChartComponent implements OnInit {
  @Output() dataSelected: EventEmitter<any> = new EventEmitter<any>();
  @Input() lineData!: any[];
  @Input() colorScheme = {
    name: 'default',
    selectable: true,
    group: ScaleType.Linear,
    domain: [
      '#A9E8DC',
      '#5ABEA9',
      '#0284A8',
      '#050C44',
      '#5ADF99',
      '#E1F7E7',
      '#A9E8DC',
      '#66C4FF',
      '#5CB1E6',
      '#4D93BF',
      '#356685',
      '#224154',
      '#CC673D',
      '#3D4ACC',
      '#7A7D99',
      '#E1F7E7',
      '#2497E8',
      '#FFCDA6',
      '#B3B13E',
      '#02BEC4',
      '#FF8080',
      '#286EFF',
      '#CCCA3D',
    ],
  };
  @Input() schemeType = 'ordinal'; // ordinal
  @Input() animations = true;
  @Input() showLegend = true;
  @Input() legendTitle!: string;
  @Input() legendPosition = 'right'; // ['right','below']
  @Input() showXAxis = true;
  @Input() showYAxis = true;
  @Input() showGridLines = false;
  @Input() showRoundDomains = false;
  @Input() showXAxisLabel = true;
  @Input() showYAxisLabel = true;
  @Input() trimXAxisTicks = false;
  @Input() trimYAxisTicks = false;
  @Input() maxXAxisTickLength = 10;
  @Input() maxYAxisTickLength = 10;
  @Input() showDataLabel = true;
  @Input() gradient = false;
  @Input() tooltipDisabled = false;
  @Input() roundEdges = true;
  @Input() view = [600, 400];

  ngOnInit() {}

  onSelect(event: any) {
    console.log('listen: on-line-chart-select');
    console.log(event);
    this.dataSelected.emit(event);
  }
}

export class LineData {
  name?: string;
  series?: any;
  constructor(name?: string, series?: any) {
    this.name = name;
    this.series = series;
  }
}
/** series is a list of name:value pairs eg. series:[ {name: banks, value: 3}, {name: transport: value: 26} ] */
