import { Component, Input, Output, EventEmitter, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import SharedModule from 'app/shared/shared.module';

@Component({
  selector: 'jhi-slider',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './slides.component.html',
  styleUrls: ['./slides.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SlidesComponent implements OnDestroy {
  @Input() slides: any[] = [];
  @Input() imageWidth = '';
  @Input() imageHeight = '';
  @Input() slideWidth = '100%';
  @Input() slideHeight = '600px';
  @Input() showCaption = true;
  @Output() slideSelected = new EventEmitter<any>();

  containerStyle = '';

  constructor() {
    this.containerStyle = 'width: '.concat(this.slideWidth).concat(' !important; height: ').concat(this.slideHeight).concat(' !important;');
  }

  ngOnDestroy(): void {
    this.slideSelected = Object.assign({});
  }

  onClick(item: any): void {
    this.slideSelected.emit(item);
  }

  trackId(index: number, item: any): number {
    return item.id;
  }
}
