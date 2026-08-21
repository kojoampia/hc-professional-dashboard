import { ChangeDetectionStrategy, Component } from '@angular/core';

import SharedModule from 'app/shared/shared.module';
import { RIBBON_ENV } from 'app/app.constants';

/**
 * The environment ribbon — drawn from a build-time constant, never from the server.
 *
 * <p>This component used to call `ProfileService`, which fetched `GET /management/info` on every
 * page load and read `activeProfiles` and `display-ribbon-on-profiles` off the actuator. **A
 * management endpoint has no business being reachable from a browser**, and the production nginx
 * returns 404 for `/management` for exactly that reason — so the call never returned a usable body
 * there, and the SPA threw `TypeError: Cannot read properties of null (reading 'activeProfiles')` on
 * every load of the live site.
 *
 * <p>A build already knows whether it is a development build. Nothing about the ribbon needs a round
 * trip, so there is no longer one: `ProfileService` and its model are gone with the call.
 */
@Component({
  selector: 'hpd-page-ribbon',
  template: `
    @if (ribbonEnv) {
      <div class="ribbon">
        <a href="" jhiTranslate="global.ribbon.{{ ribbonEnv }}">{{ { dev: 'Development' }[ribbonEnv] || '' }}</a>
      </div>
    }
  `,
  styleUrl: './page-ribbon.component.scss',
  imports: [SharedModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PageRibbonComponent {
  readonly ribbonEnv = RIBBON_ENV;
}
