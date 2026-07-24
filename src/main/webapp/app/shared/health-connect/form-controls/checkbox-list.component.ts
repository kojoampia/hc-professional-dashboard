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
    <div role="group" class="grid gap-3" [attr.aria-label]="labelKey | translate">
      @for (option of options; track option.id) {
        <label class="group flex cursor-pointer items-center gap-3">
          <input
            class="hpd-focusable h-5 w-5 rounded border-slate-300 accent-hpd-primary"
            type="checkbox"
            [checked]="checkedIds.includes(option.id)"
            [disabled]="disabled || (option.disabled ?? false)"
            (change)="toggle(option.id, $any($event.target).checked)"
          />
          <span class="select-none font-medium text-slate-700 group-hover:text-slate-900">{{ option.labelKey | translate }}</span>
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
  @Input() disabled = false;
  @Output() readonly checkedIdsChange = new EventEmitter<readonly string[]>();

  toggle(id: string, checked: boolean): void {
    if (this.disabled) {
      return;
    }
    this.checkedIdsChange.emit(checked ? [...this.checkedIds, id] : this.checkedIds.filter(value => value !== id));
  }
}
