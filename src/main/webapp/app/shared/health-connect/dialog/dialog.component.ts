import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'hpd-dialog',
  imports: [TranslateModule],
  template: `
    <section
      #dialog
      class="hpd-dialog hpd-surface"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="dialogTitleId"
      tabindex="-1"
      (keydown.escape)="closed.emit()"
      (keydown.tab)="trapFocus($event)"
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
export default class DialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('dialog', { read: ElementRef }) dialog?: ElementRef<HTMLElement>;
  @ViewChild('closeButton') closeButton?: ElementRef<HTMLButtonElement>;
  @Input({ required: true }) titleKey!: string;
  @Input() dialogTitleId = 'hpd-dialog-title';
  @Output() readonly closed = new EventEmitter<void>();
  private activeElement: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.focusCloseButton();
  }

  ngOnDestroy(): void {
    this.activeElement?.focus();
  }

  focusCloseButton(): void {
    this.closeButton?.nativeElement.focus();
  }

  trapFocus(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const focusable = Array.from(
      this.dialog?.nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (!focusable.length) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (keyboardEvent.shiftKey && document.activeElement === first) {
      keyboardEvent.preventDefault();
      last.focus();
    } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
      keyboardEvent.preventDefault();
      first.focus();
    }
  }
}
