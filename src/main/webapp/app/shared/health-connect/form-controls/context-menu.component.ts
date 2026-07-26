import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export interface ContextMenuAction {
  id: string;
  labelKey: string;
  disabled?: boolean;
}

@Component({
  standalone: true,
  selector: 'hpd-context-menu',
  imports: [TranslateModule],
  template: `
    <div class="relative inline-block">
      <button
        class="hpd-focusable rounded-full border border-hpd-border px-2 py-1 text-sm font-medium text-hpd-primary-dark hover:bg-hpd-cream"
        type="button"
        [attr.aria-label]="labelKey | translate"
        [attr.aria-expanded]="open()"
        aria-haspopup="menu"
        (click)="toggle()"
        (keydown.escape)="close()"
      >
        <span aria-hidden="true">⋮</span>
      </button>
      @if (open()) {
        <ul class="absolute right-0 z-10 mt-1 min-w-[10rem] rounded-hpd-sm border border-hpd-border bg-white py-1 shadow-md" role="menu">
          @for (action of actions; track action.id) {
            <li role="none">
              <button
                class="hpd-focusable block w-full px-3 py-2 text-left text-sm text-hpd-primary-dark hover:bg-hpd-cream disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                role="menuitem"
                [disabled]="action.disabled ?? false"
                (click)="choose(action.id)"
              >
                {{ action.labelKey | translate }}
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ContextMenuComponent {
  @Input({ required: true }) labelKey!: string;
  @Input({ required: true }) actions: readonly ContextMenuAction[] = [];
  @Output() readonly actionSelected = new EventEmitter<string>();

  readonly open = signal(false);

  toggle(): void {
    this.open.update(open => !open);
  }

  close(): void {
    this.open.set(false);
  }

  choose(id: string): void {
    this.actionSelected.emit(id);
    this.close();
  }
}
