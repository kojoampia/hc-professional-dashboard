import { Routes } from '@angular/router';

/**
 * The applicant wizard, mounted by app.routes.ts on the signed-out shell behind the signed-in guard.
 *
 * <p>Its own file rather than an entry in {@link healthConnectRoutes} because it is the one
 * authenticated surface that does not belong in the portal frame: an applicant holds only
 * {@code ROLE_USER} until their credentials are approved, so every other destination in the sidebar
 * would refuse them. The path segment comes from the parent, so this declares an empty path.
 */
const onboardingRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/onboarding-page.component'),
    data: { titleKey: 'healthConnect.onboarding.title' },
  },
];

export default onboardingRoutes;
