import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Route } from '@angular/router';

import accountRoutes from 'app/account/account.route';
import appRoutes from 'app/app.routes';

/**
 * The page is a composition and a set of redirects, so this checks those two things rather than
 * rendering it — the sections have their own specs, and mounting all three here would only re-test
 * them through a layer of indirection.
 */
describe('Profile Page', () => {
  it('should carry every section, including the folded-in onboarding steps', () => {
    const template = readFileSync(join(__dirname, 'profile-page.component.html'), 'utf8');

    expect(template).toContain('<hpd-completion-meter>');
    expect(template).toContain('<hpd-settings>');
    expect(template).toContain('<hpd-clinical-profile>');
    expect(template).toContain('<hpd-documents-tab>');
    expect(template).toContain('<hpd-application-tab>');
    expect(template).toContain('<hpd-password>');
  });

  /**
   * ⛔ **"The wizard is gone" is no longer true** — `profile.md:275-277` reverses that decision and
   * T8 rebuilds it as four routed overlays over the dashboard (`wizardPanePath`). What this case
   * asserts is unaffected and stays green, so only the reasoning is corrected: the top-level
   * `/onboarding` path is still a redirect with no component behind it, still the activation email's
   * landing spot, and still **T6's to re-point** — the wizard's panes live under `dashboard/` and
   * collide with nothing here. A function rather than a string because `redirectTo` treats a string
   * as a path, so the query parameter would be matched literally.
   *
   * <p>⚠ Until T6 re-points it, the activation email lands on this tab page rather than on pane 1.
   * That is a sequencing consequence of T6 being scheduled last, not an oversight: the wizard is
   * reachable from the sidebar's own Onboarding item in the meantime.
   */
  it('should redirect the /onboarding path to the application tab until T6 re-points it', () => {
    const onboarding = appRoutes.find((route: Route) => route.path === 'onboarding');

    expect(onboarding).toBeDefined();
    expect(typeof onboarding!.redirectTo).toBe('function');
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
