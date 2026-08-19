import { Route, Routes } from '@angular/router';

import routes from './app.routes';
import entityRoutes from './entities/entity.routes';
import healthConnectRoutes from './health-connect/health-connect.routes';

/**
 * Route precedence between the hand-built screens and the generated entity CRUD.
 *
 * <p>`/duty-roster` was declared by both files, and `entity.routes.ts` was registered first, so the
 * JHipster list won. It calls the admin-only `GET /api/duty-rosters`, so a clinician opening Duty
 * roster read "You are not authorized to access this page" — while the BridgeCare page it shadowed,
 * which already asks for `/my`, had never been reachable at all.
 *
 * <p>Two things hold the fix and both are checked here, because either alone is fragile: the
 * generated route moved to `entities/duty-roster`, and the hand-built children are registered
 * first so a future regeneration cannot re-introduce the same shadowing silently.
 */
describe('Route precedence', () => {
  const shell = routes.find((route: Route) => route.children?.some(child => child.path === 'admin'))!;
  const lazyChildren = shell.children!.filter(child => child.path === '' && child.loadChildren);

  const pathsIn = (declared: Routes): string[] => declared.map(route => route.path ?? '');

  it('registers the hand-built screens before the generated entities', async () => {
    expect(lazyChildren).toHaveLength(2);

    const loaded = await Promise.all(lazyChildren.map(child => (child.loadChildren as () => Promise<Routes>)()));
    const [first, second] = loaded.map(module => pathsIn((module as unknown as { default: Routes }).default ?? module));

    expect(first).toContain('duty-roster');
    expect(second).not.toContain('duty-roster');
  });

  it('gives the clinician page /duty-roster', () => {
    expect(pathsIn(healthConnectRoutes)).toContain('duty-roster');
  });

  it('moves the generated CRUD to entities/duty-roster', () => {
    const paths = pathsIn(entityRoutes);

    expect(paths).toContain('entities/duty-roster');
    expect(paths).not.toContain('duty-roster');
  });

  /**
   * The rename only helps while it is the sole collision. If a regeneration introduces another one
   * the ordering above decides it, but silently — this fails instead, so it gets a decision.
   */
  it('has no other path claimed by both route files', () => {
    const collisions = pathsIn(entityRoutes).filter(path => pathsIn(healthConnectRoutes).includes(path));

    expect(collisions).toEqual([]);
  });
});
