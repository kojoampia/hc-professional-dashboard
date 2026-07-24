import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'hpd-text-input',
  imports: [FormsModule, TranslateModule],
  template: `
    <label class="grid gap-1 text-sm text-slate-700">
      <span>{{ labelKey | translate }}</span>
      @if (multiline) {
        <textarea
          class="hpd-focusable w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
          [disabled]="disabled"
          [readOnly]="readOnly"
          [value]="value"
          (input)="valueChange.emit($any($event.target).value)"
        ></textarea>
      } @else {
        <input
          class="hpd-focusable w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
          [type]="type"
          [disabled]="disabled"
          [readOnly]="readOnly"
          [value]="value"
          (input)="valueChange.emit($any($event.target).value)"
        />
      }
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TextInputComponent {
  @Input({ required: true }) labelKey!: string;
  @Input() value = '';
  @Input() type = 'text';
  @Input() multiline = false;
  @Input() disabled = false;
  @Input() readOnly = false;
  @Output() readonly valueChange = new EventEmitter<string>();
}
