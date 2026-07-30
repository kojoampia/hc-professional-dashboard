import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import DutyRosterResolve from './route/duty-roster-routing-resolve.service';

const dutyRosterRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/duty-roster').then(m => m.DutyRosterComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/duty-roster-detail').then(m => m.DutyRosterDetailComponent),
    resolve: {
      dutyRoster: DutyRosterResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/duty-roster-update').then(m => m.DutyRosterUpdateComponent),
    resolve: {
      dutyRoster: DutyRosterResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/duty-roster-update').then(m => m.DutyRosterUpdateComponent),
    resolve: {
      dutyRoster: DutyRosterResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default dutyRosterRoute;
