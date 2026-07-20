import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import MedCaseResolve from './route/med-case-routing-resolve.service';

const medCaseRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/med-case').then(m => m.MedCase),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/med-case-detail').then(m => m.MedCaseDetail),
    resolve: {
      medCase: MedCaseResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/med-case-update').then(m => m.MedCaseUpdate),
    resolve: {
      medCase: MedCaseResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/med-case-update').then(m => m.MedCaseUpdate),
    resolve: {
      medCase: MedCaseResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default medCaseRoute;
