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
      class="hpd-dialog"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="dialogTitleId"
      tabindex="-1"
      (keydown.escape)="closed.emit()"
      (keydown.tab)="trapFocus($event)"
    >
      <header>
        <h2 [id]="dialogTitleId">{{ titleKey | translate }}</h2>
        <button
          #closeButton
          class="hpd-focusable cursor-pointer rounded-hpd-sm border-[1.5px] border-white/30 bg-transparent px-3 py-1.5 text-sm font-bold text-white hover:bg-white/10"
          type="button"
          (click)="closed.emit()"
        >
          {{ 'healthConnect.actions.close' | translate }}
        </button>
      </header>
      <div class="hpd-dialog__body"><ng-content /></div>
    </section>
  `,
  styles: `
    .hpd-dialog {
      max-width: 36rem;
      overflow: hidden;
      border-radius: var(--hpd-r-lg);
      background: #fff;
      color: var(--hpd-color-text-primary);
      box-shadow: var(--hpd-sh-lg);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.375rem;
      background: var(--hpd-color-primary);
      color: #fff;
    }

    header h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
    }

    .hpd-dialog__body {
      padding: 1.25rem;
    }
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
