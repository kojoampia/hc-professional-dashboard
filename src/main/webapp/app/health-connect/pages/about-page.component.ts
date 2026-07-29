import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

/** Static "Why Abofonsa BridgeCare — Professional" page (professional-web.md). */
@Component({
  standalone: true,
  selector: 'hpd-about-page',
  imports: [TranslateModule],
  template: `
    <main class="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div class="rounded-hpd border border-hpd-border bg-white p-6 shadow-hpd-sm">
        <h1 class="mb-2 text-lg font-extrabold tracking-tight text-hpd-primary-dark">{{ 'healthConnect.about.title' | translate }}</h1>
        <p class="m-0 max-w-[70ch] text-[15px] leading-relaxed text-hpd-muted">{{ 'healthConnect.about.body' | translate }}</p>
      </div>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AboutPageComponent {}
