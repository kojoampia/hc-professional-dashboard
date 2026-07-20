import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'hpd-loading-skeleton',
  imports: [TranslateModule],
  template: `
    <div class="hpd-loading-skeleton" role="status">
      <span class="visually-hidden">{{ labelKey | translate }}</span>
      @for (item of items; track item) {
        <div class="hpd-loading-skeleton__line" aria-hidden="true"></div>
      }
    </div>
  `,
  styles: `
    .hpd-loading-skeleton__line { min-height: 1.25rem; margin-block: 0.5rem; border-radius: 0.25rem; background: linear-gradient(90deg, #eee, #f7f7f7, #eee); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoadingSkeletonComponent {
  @Input() labelKey = 'healthConnect.states.loading';
  @Input() count = 3;

  get items(): number[] {
    return Array.from({ length: this.count }, (_value, index) => index);
  }
}
