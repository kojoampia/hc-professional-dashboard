import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import {
  TileboxComponent,
  SlidesComponent,
  SlideSelectorComponent,
  PageDisplayComponent,
  InfoBoxComponent,
  InfoBoxSmallComponent,
  FileViewerComponent,
  ConverseComponent,
  ChatFaqComponent,
  ChatAccordionComponent,
  BarComponent,
  BadgeboxComponent,
  HeatmapComponent,
  HistogramComponent,
  LineChartComponent,
  PiechartComponent,
  TreeMapComponent,
} from './index';
import SharedModule from 'app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    NgbModule,
    SharedModule,
    BarComponent,
    FileViewerComponent,
    TileboxComponent,
    SlidesComponent,
    PageDisplayComponent,
    InfoBoxComponent,
    InfoBoxSmallComponent,
    ConverseComponent,
    ChatFaqComponent,
    ChatAccordionComponent,
    BadgeboxComponent,
    HeatmapComponent,
    HistogramComponent,
    LineChartComponent,
    PiechartComponent,
    TreeMapComponent,
  ],
  exports: [
    BarComponent,
    InfoBoxComponent,
    InfoBoxSmallComponent,
    FileViewerComponent,
    TileboxComponent,
    SlidesComponent,
    PageDisplayComponent,
    ConverseComponent,
    ChatFaqComponent,
    ChatAccordionComponent,
    BadgeboxComponent,
    HeatmapComponent,
    HistogramComponent,
    LineChartComponent,
    PiechartComponent,
    TreeMapComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class WidgetsModule {}
