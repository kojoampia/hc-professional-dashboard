import { Routes } from '@angular/router';

import profileRoute from './profile/profile.route';

/**
 * The account screens that require an account — now one page rather than two.
 *
 * <p>Account details, the clinical profile and the password change used to be `settings`, nothing,
 * and `password` respectively. They are one route with three sections, and the two old paths
 * redirect onto it rather than 404: they were linked from the sidebar user card and from anywhere
 * a clinician bookmarked them, and a redirect costs nothing next to breaking those. Both keep
 * `pathMatch: 'full'` so neither swallows a deeper path later.
 *
 * <p>It is a child of the portal shell — someone changing their password is signed in and expects
 * the navigation they had a moment ago. The public four live in {@link accountPublicRoutes}.
 */
const accountRoutes: Routes = [
  profileRoute,
  { path: 'settings', redirectTo: 'profile', pathMatch: 'full' },
  { path: 'password', redirectTo: 'profile', pathMatch: 'full' },
];

export default accountRoutes;
