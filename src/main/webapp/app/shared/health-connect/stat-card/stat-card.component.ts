import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

export type StatCardVariant = 'neutral' | 'urgent' | 'open' | 'closed';

// BridgeCare stat cards (demo .stat-card): status variants get a tinted card
// background and a colored value; status is no longer conveyed by a badge/bar.
// Colors must stay in agreement with health-connect/charts/chart-transforms.ts's
// CASE_STATUS_COLORS (danger/warning-accent/success-accent tokens).
const CARD_CLASSES: Record<StatCardVariant, string> = {
  neutral: 'bg-white',
  urgent: 'bg-hpd-urgent',
  open: 'bg-hpd-open',
  closed: 'bg-hpd-closed',
};

const VALUE_CLASSES: Record<StatCardVariant, string> = {
  neutral: 'text-hpd-primary-dark',
  urgent: 'text-hpd-danger',
  open: 'text-hpd-warning',
  closed: 'text-hpd-success',
};

const BASE_CARD_CLASS =
  'hpd-focusable relative block w-full overflow-hidden rounded-hpd border border-hpd-border p-4 text-left no-underline transition-shadow duration-150';

@Component({
  standalone: true,
  selector: 'hpd-stat-card',
  imports: [NgTemplateOutlet, RouterLink, TranslateModule],
  template: `
    <ng-container *ngTemplateOutlet="link ? linkTpl : interactive ? buttonTpl : staticTpl"></ng-container>

    <ng-template #cardBody>
      <p class="m-0 text-[11px] font-bold uppercase tracking-wider text-hpd-muted">{{ labelKey | translate }}</p>
      <h3 class="m-0 mt-1 text-[26px] font-extrabold leading-none tracking-tight" [class]="valueClass">{{ count }}</h3>
    </ng-template>

    <ng-template #linkTpl>
      <a [class]="interactiveCardClass" [routerLink]="link" [attr.aria-current]="selected ? 'page' : null" (click)="activate.emit()">
        <ng-container *ngTemplateOutlet="cardBody"></ng-container>
      </a>
    </ng-template>

    <ng-template #buttonTpl>
      <button [class]="interactiveCardClass" type="button" [attr.aria-pressed]="selected" (click)="activate.emit()">
        <ng-container *ngTemplateOutlet="cardBody"></ng-container>
      </button>
    </ng-template>

    <ng-template #staticTpl>
      <div [class]="cardClass">
        <ng-container *ngTemplateOutlet="cardBody"></ng-container>
      </div>
    </ng-template>
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

  get cardClass(): string {
    return `${BASE_CARD_CLASS} ${CARD_CLASSES[this.variant]}`;
  }

  get interactiveCardClass(): string {
    // Demo .stat-card.active: navy border + soft navy ring.
    const selectedClass = this.selected ? ' hpd-stat-card--selected border-hpd-primary ring-2 ring-hpd-primary/15' : '';
    return `${this.cardClass} cursor-pointer hover:shadow-hpd${selectedClass}`;
  }

  get valueClass(): string {
    return VALUE_CLASSES[this.variant];
  }
}
