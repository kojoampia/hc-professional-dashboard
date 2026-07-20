import { OnInit, Component, Input, EventEmitter, Output, TemplateRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { LegendPosition, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';

@Component({
  selector: 'jhi-histogram',
  templateUrl: './histogram.component.html',
  imports: [NgxChartsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HistogramComponent implements OnInit {
  @Output() dataSelected: EventEmitter<any> = new EventEmitter<any>();
  @Input() view: number[] = [1720, 600];
  @Input() data!: HistogramData[];
  @Input() colorScheme = {
    name: 'default',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#5ADF99', '#E1F7E7', '#A9E8DC', '#02BEC4', '#ff6600', '#59ff00', '#ffb600', '#1472ff'],
  };
  @Input() schemeType = 'ordinal'; // linear
  @Input() animations = true;
  @Input() showLegend = true;
  @Input() legendTitle!: string;
  @Input() legendPosition = LegendPosition.Right; // ['right','below']
  @Input() showXAxis = false;
  @Input() showYAxis = false;
  @Input() showGridLines = false;
  @Input() showRoundDomains = false;
  @Input() showXAxisLabel = false;
  @Input() showYAxisLabel = false;
  @Input() xAxisLabel!: string;
  @Input() yAxisLabel!: string;
  @Input() trimXAxisTicks = false;
  @Input() trimYAxisTicks = false;
  @Input() maxXAxisTickLength = 10;
  @Input() maxYAxisTickLength = 10;
  @Input() xAxisTickFormating: any;
  @Input() yAxisTickFormating: any;
  @Input() xAxisTicks!: any[];
  @Input() yAxisTicks!: any[];
  @Input() showDataLabel!: boolean;
  @Input() gradient = false;
  @Input() barPadding = 5;
  @Input() tooltipDisabled!: boolean;
  @Input() tooltipTemplate!: TemplateRef<any>;
  @Input() yScaleMax!: number;
  @Input() yScaleMin!: number;
  @Input() yScale!: number;
  @Input() roundEdges!: boolean;

  ngOnInit() {}

  onSelect(event: any) {
    console.log('listen: on-histogram-select');
    console.log(event);
    this.dataSelected.emit(event);
  }
}

export class HistogramData {
  name?: string;
  value?: number;
  data?: any;
  constructor(name?: string, value?: number, data?: any) {
    this.name = name;
    this.value = value;
    this.data = data;
  }
}
/** series is a list of name:value pairs eg. series:[ {name: banks, value: 3}, {name: transport: value: 26} ] */
