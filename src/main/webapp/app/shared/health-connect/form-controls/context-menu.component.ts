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
    <div class="dropdown">
      <button
        class="hpd-focusable btn btn-outline-secondary"
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
        <ul class="dropdown-menu show" role="menu">
          @for (action of actions; track action.id) {
            <li role="none">
              <button
                class="dropdown-item hpd-focusable"
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
