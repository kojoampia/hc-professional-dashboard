import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export interface CheckboxListOption {
  id: string;
  labelKey: string;
  disabled?: boolean;
}

@Component({
  standalone: true,
  selector: 'hpd-checkbox-list',
  imports: [TranslateModule],
  template: `
    <div role="group" [attr.aria-label]="labelKey | translate">
      @for (option of options; track option.id) {
        <label class="form-check">
          <input
            class="form-check-input hpd-focusable"
            type="checkbox"
            [checked]="checkedIds.includes(option.id)"
            [disabled]="option.disabled ?? false"
            (change)="toggle(option.id, $any($event.target).checked)"
          />
          <span class="form-check-label">{{ option.labelKey | translate }}</span>
        </label>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CheckboxListComponent {
  @Input({ required: true }) labelKey!: string;
  @Input({ required: true }) options: readonly CheckboxListOption[] = [];
  @Input() checkedIds: readonly string[] = [];
  @Output() readonly checkedIdsChange = new EventEmitter<readonly string[]>();

  toggle(id: string, checked: boolean): void {
    this.checkedIdsChange.emit(checked ? [...this.checkedIds, id] : this.checkedIds.filter(value => value !== id));
  }
}
