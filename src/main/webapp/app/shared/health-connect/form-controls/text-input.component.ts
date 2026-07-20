import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'hpd-text-input',
  imports: [FormsModule, TranslateModule],
  template: `
    <label>
      <span>{{ labelKey | translate }}</span>
      @if (multiline) {
        <textarea
          class="form-control hpd-focusable"
          [disabled]="disabled"
          [readOnly]="readOnly"
          [value]="value"
          (input)="valueChange.emit($any($event.target).value)"
        ></textarea>
      } @else {
        <input
          class="form-control hpd-focusable"
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
