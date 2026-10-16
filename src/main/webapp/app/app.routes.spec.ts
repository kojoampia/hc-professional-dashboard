import { Route } from '@angular/router';

import { wizardPanePath } from 'app/onboarding/wizard.service';
import routes from './app.routes';

describe('app routes', () => {
  const find = (path: string): Route => routes.find(route => route.path === path)!;

  /**
   * `/onboarding` — the applicant's bookmark and where the activation email's "continue your
   * application" lands — goes to the wizard's first pane (T6, re-pointing the redirect T8 left on
   * the retired tab page).
   *
   * <p>⚠ **A plain string, deliberately.** The old target carried `?tab=application`, which needed a
   * `redirectTo` function to survive as a query parameter; the panes are routes of their own, so the
   * tab shim dies with the tabs rather than being translated — the old deep links have no tab to
   * reach, and a bookmark landing on the first pane is correct. Read from {@link wizardPanePath} so
   * the pane's address keeps its one spelling.
   */
  it('redirects /onboarding to the wizard, not the retired tab page', () => {
    const route = find('onboarding');
    expect(route).toBeDefined();
    expect(route.pathMatch).toBe('full');
    expect(route.redirectTo).toBe(wizardPanePath('account'));
  });
});
