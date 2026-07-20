import { CUSTOM_ELEMENTS_SCHEMA, Component, Input, OnInit } from '@angular/core';
import SharedModule from 'app/shared/shared.module';
import { IFrequentAsked } from 'app/widgets/faq/frequent-asked.model';

@Component({
    selector: 'jhi-chat-accordion',
    templateUrl: './chat-accordion.component.html',
    styleUrls: ['./chat-accordion.component.scss'],
    imports: [SharedModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ChatAccordionComponent implements OnInit {
  @Input() faq?: IFrequentAsked;

  isPanelOpen = false;

  constructor() {}

  ngOnInit(): void {}

  togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
  }
}
