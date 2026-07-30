import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import ProfileResolve from './route/profile-routing-resolve.service';

const profileRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/profile').then(m => m.ProfileComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/profile-detail').then(m => m.ProfileDetailComponent),
    resolve: {
      profile: ProfileResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/profile-update').then(m => m.ProfileUpdateComponent),
    resolve: {
      profile: ProfileResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/profile-update').then(m => m.ProfileUpdateComponent),
    resolve: {
      profile: ProfileResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default profileRoute;
