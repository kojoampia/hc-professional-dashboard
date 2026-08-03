import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import ActivityLogEntryResolve from './route/activity-log-entry-routing-resolve.service';

const activityLogEntryRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/activity-log-entry').then(m => m.ActivityLogEntryComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/activity-log-entry-detail').then(m => m.ActivityLogEntryDetailComponent),
    resolve: {
      activityLogEntry: ActivityLogEntryResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/activity-log-entry-update').then(m => m.ActivityLogEntryUpdateComponent),
    resolve: {
      activityLogEntry: ActivityLogEntryResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/activity-log-entry-update').then(m => m.ActivityLogEntryUpdateComponent),
    resolve: {
      activityLogEntry: ActivityLogEntryResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default activityLogEntryRoute;
