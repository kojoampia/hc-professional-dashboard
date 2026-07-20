import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'hpd-dialog',
  imports: [TranslateModule],
  template: `
    <section
      class="hpd-dialog hpd-surface"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="dialogTitleId"
      tabindex="-1"
      (keydown.escape)="closed.emit()"
    >
      <header>
        <h2 [id]="dialogTitleId">{{ titleKey | translate }}</h2>
        <button #closeButton class="hpd-focusable btn btn-outline-secondary" type="button" (click)="closed.emit()">
          {{ 'healthConnect.actions.close' | translate }}
        </button>
      </header>
      <ng-content />
    </section>
  `,
  styles: `
    .hpd-dialog { max-width: 36rem; padding: 1.5rem; }
    header { display: flex; align-items: start; justify-content: space-between; gap: 1rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DialogComponent implements AfterViewInit {
  @ViewChild('closeButton') closeButton?: ElementRef<HTMLButtonElement>;
  @Input({ required: true }) titleKey!: string;
  @Input() dialogTitleId = 'hpd-dialog-title';
  @Output() readonly closed = new EventEmitter<void>();

  ngAfterViewInit(): void {
    this.focusCloseButton();
  }

  focusCloseButton(): void {
    this.closeButton?.nativeElement.focus();
  }
}
