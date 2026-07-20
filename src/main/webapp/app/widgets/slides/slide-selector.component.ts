import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import SharedModule from 'app/shared/shared.module';

@Component({
    selector: 'jhi-slide-selector',
    templateUrl: './slide-selector.component.html',
    styleUrls: ['./slides.component.scss'],
    imports: [SharedModule]
})
export class SlideSelectorComponent implements OnDestroy {
  @Input() slides: any[] = [];
  @Output() slideSelected = new EventEmitter<any>();

  constructor() {}

  ngOnDestroy(): void {
    this.slideSelected = Object.assign({});
  }

  onClick(item: any): void {
    // console.log('slide-selected');
    // console.log(item);
    this.slideSelected.emit(item);
  }

  trackId(index: number): number {
    return index;
  }
}
