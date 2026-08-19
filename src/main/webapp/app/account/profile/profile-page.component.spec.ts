import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Route } from '@angular/router';

import accountRoutes from 'app/account/account.route';

/**
 * The page is a composition and a set of redirects, so this checks those two things rather than
 * rendering it — the sections have their own specs, and mounting all three here would only re-test
 * them through a layer of indirection.
 */
describe('Profile Page', () => {
  it('should stack all three sections', () => {
    const template = readFileSync(join(__dirname, 'profile-page.component.html'), 'utf8');

    expect(template).toContain('<hpd-settings>');
    expect(template).toContain('<hpd-clinical-profile>');
    expect(template).toContain('<hpd-password>');
  });

  /**
   * `/account/settings` and `/account/password` were real routes for as long as this portal has
   * existed — the sidebar linked to both, and clinicians bookmark what they use. Folding them into
   * one page is not a reason to start 404ing them.
   */
  it.each([
    ['settings', 'profile'],
    ['password', 'profile'],
  ])('should redirect the retired /%s path to /%s', (from, to) => {
    const route = accountRoutes.find((r: Route) => r.path === from);

    expect(route).toBeDefined();
    expect(route!.redirectTo).toBe(to);
    // Without this a later child route under the same prefix would be swallowed by the redirect.
    expect(route!.pathMatch).toBe('full');
  });

  it('should serve the profile page itself', () => {
    const route = accountRoutes.find((r: Route) => r.path === 'profile');

    expect(route).toBeDefined();
    expect(route!.canActivate).toHaveLength(1);
  });
});
