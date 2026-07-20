/* eslint-disable */
import { Component, Input, OnInit, ɵSafeHtml } from '@angular/core';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import SharedModule from 'app/shared/shared.module';

@Component({
    selector: 'jhi-page-display',
    templateUrl: './page-display.component.html',
    styleUrls: ['./page-display.component.scss'],
    imports: [SharedModule]
})
export class PageDisplayComponent implements OnInit {
  @Input() title?: string;
  @Input() content?: string;
  safeContent?: SafeHtml;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    if (this.content) {
      this.safeContent = this.sanitizer.bypassSecurityTrustHtml(this.content!);
    }
  }
}
