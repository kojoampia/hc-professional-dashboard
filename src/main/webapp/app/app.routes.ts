import { Routes } from '@angular/router';

import { Authority } from 'app/config/authority.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { errorRoute } from './layouts/error/error.route';

import AuthShellComponent from './layouts/auth-shell/auth-shell.component';
import ShellComponent from './layouts/shell/shell.component';
import LoginComponent from './login/login.component';

/**
 * Two layouts, chosen by the route.
 *
 * <p>Sign-in, registration, activation and password reset are reached before there is an account to
 * navigate, so they render on {@code AuthShellComponent}. Everything else is a child of
 * {@code ShellComponent}, which supplies the sidebar, topbar and tab bar, and is guarded as a whole
 * — <b>there is no signed-out view of the portal</b>.
 *
 * <p>This replaces a single layout that wrapped every screen. A visitor at the sign-in page used to
 * read a sidebar listing Patient directory, Case queue and Duty roster, each of which bounced them
 * straight back to sign-in. Same arrangement as {@code hc-patient/web}, whose routes this follows.
 */
const routes: Routes = [
  {
    // Both shells below are empty-path parents, so the router would otherwise resolve `/` to
    // whichever is declared first and render it with an empty outlet. Sending the root somewhere
    // concrete removes the ambiguity: `dashboard` matches nothing under the auth shell, so the
    // router falls through to the portal, and its guard bounces to `/login` when signed out.
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: '',
    component: AuthShellComponent,
    children: [
      {
        path: 'login',
        component: LoginComponent,
        title: 'login.title',
      },
      {
        path: 'account',
        loadChildren: () => import('./account/account-public.route'),
      },
      {
        // THE CAREERS ENTRY POINT. careers-handoff-contract.md documents web.abofonsa.com/careers
        // linking to `/register?track=…&locale=…&src=web-careers`, and careers-handoff.service.ts
        // repeats that path in its own comment — but the route is mounted under `account/`, so
        // `/register` fell through to the SPA and Angular redirected it to `/404`. The capture logic
        // was written, tested and shipped behind a door that did not open.
        //
        // Angular carries query parameters across a redirect by default, which is the whole point
        // here: dropping `track` silently is the failure the contract is most concerned with, since
        // the candidate is then asked to choose their own role and a visiting physician who does not
        // notice the default is filed as a nurse.
        path: 'register',
        redirectTo: 'account/register',
        pathMatch: 'full',
      },
    ],
  },
  {
    // Authenticated, but with no clinical role yet — an applicant holds only ROLE_USER until their
    // credentials are approved. On the signed-out shell behind the signed-in guard, because the
    // portal frame would show them a sidebar of destinations that all refuse them.
    path: 'onboarding',
    component: AuthShellComponent,
    canActivate: [UserRouteAccessService],
    loadChildren: () => import('./health-connect/onboarding.routes'),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [UserRouteAccessService],
    children: [
      {
        path: 'admin',
        data: {
          authorities: [Authority.ADMIN],
        },
        canActivate: [UserRouteAccessService],
        loadChildren: () => import('./admin/admin.routes'),
      },
      {
        path: 'account',
        loadChildren: () => import('./account/account.route'),
      },
      {
        path: '',
        loadChildren: () => import(`./entities/entity.routes`),
      },
      {
        path: '',
        loadChildren: () => import('./health-connect/health-connect.routes'),
      },
    ],
  },
  ...errorRoute,
];

export default routes;
