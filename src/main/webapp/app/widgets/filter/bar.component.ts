import { CUSTOM_ELEMENTS_SCHEMA, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import SharedModule from 'app/shared/shared.module';

@Component({
  selector: 'jhi-filter-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.scss'],
  imports: [SharedModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BarComponent implements OnInit {
  @Input() itemList?: any[] | [];
  @Output() selectedItem: EventEmitter<any> = new EventEmitter<any>();

  filterSelected?: string | '';
  searchInput?: string | '';

  constructor() {}

  ngOnInit(): void {
    if (this.itemList && this.itemList.length > 0) {
      this.filterSelected = this.itemList[0].value;
    }
  }

  setFilterSelected(item = ''): void {
    this.filterSelected = item;
  }

  search(): void {
    this.selectedItem.emit({
      name: this.filterSelected,
      value: this.searchInput,
    });
  }
}
