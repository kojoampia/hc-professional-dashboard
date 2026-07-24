import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

export type StatCardVariant = 'neutral' | 'urgent' | 'open' | 'closed';

const BADGE_CLASSES: Record<StatCardVariant, string> = {
  neutral: 'bg-slate-100 text-slate-500',
  urgent: 'bg-rose-50 text-rose-500',
  open: 'bg-indigo-50 text-indigo-500',
  closed: 'bg-emerald-50 text-emerald-500',
};

// Decorative accent bar under the count — professional-demo.html hardcodes a fixed
// width per status variant rather than deriving it from the count, so this mirrors
// that rather than fabricating a percentage-of-count metric that doesn't exist.
const BAR_CLASSES: Record<StatCardVariant, string> = {
  neutral: 'w-[30%] bg-slate-400',
  urgent: 'w-[70%] bg-rose-500',
  open: 'w-[50%] bg-indigo-500',
  closed: 'w-[90%] bg-emerald-500',
};

@Component({
  standalone: true,
  selector: 'hpd-stat-card',
  imports: [NgTemplateOutlet, RouterLink, TranslateModule],
  template: `
    <ng-container *ngTemplateOutlet="link ? linkTpl : interactive ? buttonTpl : staticTpl"></ng-container>

    <ng-template #cardBody>
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ labelKey | translate }}</p>
      <div class="mt-2 flex items-end justify-between gap-2">
        <h3 class="text-2xl font-bold text-slate-900">{{ count }}</h3>
        <span class="rounded-full px-2 py-0.5 text-xs font-bold" [class]="badgeClass">{{ variant.toUpperCase() }}</span>
      </div>
      <div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div class="h-full rounded-full transition-all duration-500" [class]="barClass"></div>
      </div>
    </ng-template>

    <ng-template #linkTpl>
      <a
        class="hpd-focusable relative block overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        [class.hpd-stat-card--selected]="selected"
        [class.ring-2]="selected"
        [class.ring-offset-2]="selected"
        [class.ring-indigo-500]="selected"
        [routerLink]="link"
        [attr.aria-current]="selected ? 'page' : null"
        (click)="activate.emit()"
      >
        <ng-container *ngTemplateOutlet="cardBody"></ng-container>
      </a>
    </ng-template>

    <ng-template #buttonTpl>
      <button
        class="hpd-focusable relative block w-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        [class.hpd-stat-card--selected]="selected"
        [class.ring-2]="selected"
        [class.ring-offset-2]="selected"
        [class.ring-indigo-500]="selected"
        type="button"
        [attr.aria-pressed]="selected"
        (click)="activate.emit()"
      >
        <ng-container *ngTemplateOutlet="cardBody"></ng-container>
      </button>
    </ng-template>

    <ng-template #staticTpl>
      <div class="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
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

  get badgeClass(): string {
    return BADGE_CLASSES[this.variant];
  }

  get barClass(): string {
    return BAR_CLASSES[this.variant];
  }
}
