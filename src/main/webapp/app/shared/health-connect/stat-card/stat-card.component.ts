import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

export type StatCardVariant = 'neutral' | 'urgent' | 'open' | 'closed';

@Component({
  standalone: true,
  selector: 'hpd-stat-card',
  imports: [RouterLink, TranslateModule],
  template: `
    @if (link) {
      <a
        class="hpd-stat-card hpd-focusable"
        [class]="'hpd-stat-card--' + variant"
        [class.hpd-stat-card--selected]="selected"
        [routerLink]="link"
        [attr.aria-current]="selected ? 'page' : null"
        (click)="activate.emit()"
      >
        <span>{{ labelKey | translate }}</span>
        <strong>{{ count }}</strong>
      </a>
    } @else if (interactive) {
      <button
        class="hpd-stat-card hpd-focusable"
        [class]="'hpd-stat-card--' + variant"
        [class.hpd-stat-card--selected]="selected"
        type="button"
        [attr.aria-pressed]="selected"
        (click)="activate.emit()"
      >
        <span>{{ labelKey | translate }}</span>
        <strong>{{ count }}</strong>
      </button>
    } @else {
      <div class="hpd-stat-card" [class]="'hpd-stat-card--' + variant" [class.hpd-stat-card--selected]="selected">
        <span>{{ labelKey | translate }}</span>
        <strong>{{ count }}</strong>
      </div>
    }
  `,
  styles: `
    .hpd-stat-card {
      display: flex;
      min-height: 6.5rem;
      flex-direction: column;
      justify-content: space-between;
      border: 2px solid transparent;
      border-radius: 0.75rem;
      padding: 1rem;
      color: var(--hpd-color-text-primary);
      text-align: start;
      text-decoration: none;
    }
    button.hpd-stat-card {
      width: 100%;
    }
    .hpd-stat-card--neutral { background: var(--hpd-color-card-neutral); color: var(--hpd-color-text-on-dark); }
    .hpd-stat-card--urgent { background: var(--hpd-color-card-urgent); }
    .hpd-stat-card--open { background: var(--hpd-color-card-open); }
    .hpd-stat-card--closed { background: var(--hpd-color-card-closed); }
    .hpd-stat-card--selected { border-color: var(--hpd-color-primary-blue); }
    strong { font-size: 2rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StatCardComponent {
  @Input({ required: true }) labelKey!: string;
  @Input({ required: true }) count!: number;
  @Input() variant: StatCardVariant = 'neutral';
  @Input() selected = false;
  @Input() interactive = true;
  @Input() link: string | string[] | null = null;
  @Output() readonly activate = new EventEmitter<void>();
}
