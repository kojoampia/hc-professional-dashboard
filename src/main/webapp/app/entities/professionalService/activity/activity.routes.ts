import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import ActivityResolve from './route/activity-routing-resolve.service';

const activityRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/activity').then(m => m.Activity),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/activity-detail').then(m => m.ActivityDetail),
    resolve: {
      activity: ActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/activity-update').then(m => m.ActivityUpdate),
    resolve: {
      activity: ActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/activity-update').then(m => m.ActivityUpdate),
    resolve: {
      activity: ActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default activityRoute;
