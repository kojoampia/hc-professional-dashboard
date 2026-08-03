import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import DutyShiftResolve from './route/duty-shift-routing-resolve.service';

const dutyShiftRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/duty-shift').then(m => m.DutyShiftComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/duty-shift-detail').then(m => m.DutyShiftDetailComponent),
    resolve: {
      dutyShift: DutyShiftResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/duty-shift-update').then(m => m.DutyShiftUpdateComponent),
    resolve: {
      dutyShift: DutyShiftResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/duty-shift-update').then(m => m.DutyShiftUpdateComponent),
    resolve: {
      dutyShift: DutyShiftResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default dutyShiftRoute;
