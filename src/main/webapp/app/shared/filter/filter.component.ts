import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import SharedModule from '../shared.module';
import { IFilterOptions } from './filter.model';

@Component({
  selector: 'hpd-filter',
  imports: [MatIconModule, SharedModule],
  templateUrl: './filter.component.html',
})
export default class FilterComponent {
  @Input() filters!: IFilterOptions;

  clearAllFilters(): void {
    this.filters.clear();
  }

  clearFilter(filterName: string, value: string): void {
    this.filters.removeFilter(filterName, value);
  }
}
