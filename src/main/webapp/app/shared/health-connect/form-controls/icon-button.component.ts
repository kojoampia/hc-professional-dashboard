import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'hpd-icon-button',
  imports: [TranslateModule],
  template: `
    <button
      class="hpd-focusable btn btn-outline-secondary"
      type="button"
      [disabled]="disabled"
      [attr.aria-label]="labelKey | translate"
      (click)="activate.emit()"
    >
      <span aria-hidden="true">{{ icon }}</span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class IconButtonComponent {
  @Input({ required: true }) labelKey!: string;
  @Input({ required: true }) icon!: string;
  @Input() disabled = false;
  @Output() readonly activate = new EventEmitter<void>();
}
