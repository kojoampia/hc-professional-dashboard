import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'hpd-feature-page',
  imports: [TranslateModule],
  template: `<main class="hpd-container hpd-surface p-4">
    <h1>{{ titleKey | translate }}</h1>
  </main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FeaturePageComponent {
  @Input({ required: true }) titleKey!: string;
}
