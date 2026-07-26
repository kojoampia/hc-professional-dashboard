import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type ProgressBarVariant = 'success' | 'warning' | 'info';

const BAR_COLOR_CLASSES: Record<ProgressBarVariant, string> = {
  success: 'bg-hpd-success-accent',
  warning: 'bg-hpd-warning-accent',
  info: 'bg-hpd-primary',
};

@Component({
  standalone: true,
  selector: 'hpd-progress-bar',
  template: `
    <div class="flex items-center gap-3">
      <div class="h-2 flex-1 overflow-hidden rounded-full bg-hpd-cream">
        <div class="h-full rounded-full transition-all duration-500" [class]="barColorClass" [style.width.%]="percentage"></div>
      </div>
      <span class="shrink-0 text-xs font-medium text-hpd-muted"><ng-content></ng-content></span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProgressBarComponent {
  @Input({ required: true }) value = 0;
  @Input() max = 100;
  @Input() variant: ProgressBarVariant = 'success';

  get percentage(): number {
    if (!this.max) {
      return 0;
    }
    const pct = (this.value / this.max) * 100;
    return Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
  }

  get barColorClass(): string {
    return BAR_COLOR_CLASSES[this.variant];
  }
}
