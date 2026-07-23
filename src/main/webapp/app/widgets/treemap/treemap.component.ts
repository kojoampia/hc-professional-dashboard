import { OnInit, OnChanges, Component, Input, EventEmitter, Output, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
@Component({
  selector: 'hpd-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.scss'],
  imports: [NgxChartsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TreeMapComponent implements OnInit {
  @Input() isFiltered = true;
  @Input() data: TreeMap[] = [];
  @Output() dataSelected: EventEmitter<any> = new EventEmitter<any>();
  @Input() colorScheme = {
    domain: ['white', 'yellow', 'orange', 'red'],
  };
  @Input() view!: number[];
  @Input() customColors: any[] = [];

  ngOnInit() {}

  onSelect(event: any) {
    console.log('broadcast: on-treemap-select');
    console.log(event);
    this.dataSelected.emit(event);
  }
}
export class TreeMap {
  name: string;
  value: any;
  data: any;
  constructor(name: string, value: number, data?: any) {
    this.name = name;
    this.value = value;
    this.data = data;
  }
}
