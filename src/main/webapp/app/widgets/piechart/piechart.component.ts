import { CUSTOM_ELEMENTS_SCHEMA, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

@Component({
    selector: 'jhi-piechart',
    templateUrl: './piechart.component.html',
    styleUrls: ['./piechart.component.scss'],
    imports: [NgxChartsModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PiechartComponent implements OnInit {
  @Output() dataSelected: EventEmitter<any> = new EventEmitter<any>();
  @Input() data!: any[];
  @Input() view: number[] = [450, 450];
  @Input() colorScheme = {
    domain: [
      'green',
      '#aff0af',
      '#c4c3c9',
      '#b6d7ba',
      '#b9b4b4',
      'yellow',
      '#6cc97a',
      '#819b23',
      '#f9d72c',
      '#807a99',
      'f4e23f',
      '#db5700',
      'orange',
      'red',
      'blue',
      '#29aedb',
      '#84a5ba',
      '#a3999f',
      '#a7ddf0',
    ],
  };
  @Input() customColors: any[] = [];
  @Input() showLegend = true;
  @Input() showLabels = false;
  @Input() doughnut = true;
  @Input() explodeSlices = true;
  @Input() gradient = false;
  @Input() activeEntries: any[] = [];
  pieChartData: Piechart[] = [];

  constructor() {}

  ngOnInit() {
    if (this.data) {
      this.pieChartData = [];
      this.data.forEach(item => {
        this.pieChartData.push(new Piechart(item.name, item.value));
      });
    }
  }

  onSelect(event: any) {
    console.log('listen: on-treemap-select');
    console.log(event);
    this.dataSelected.emit(event);
  }
}

export class Piechart {
  name?: string;
  value?: number;
  constructor(name?: string, value?: number) {
    this.name = name;
    this.value = value;
  }
}
