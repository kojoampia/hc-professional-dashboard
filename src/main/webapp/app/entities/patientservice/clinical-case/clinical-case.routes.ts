import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import ClinicalCaseResolve from './route/clinical-case-routing-resolve.service';

const clinicalCaseRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/clinical-case').then(m => m.ClinicalCaseComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/clinical-case-detail').then(m => m.ClinicalCaseDetailComponent),
    resolve: {
      clinicalCase: ClinicalCaseResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/clinical-case-update').then(m => m.ClinicalCaseUpdateComponent),
    resolve: {
      clinicalCase: ClinicalCaseResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/clinical-case-update').then(m => m.ClinicalCaseUpdateComponent),
    resolve: {
      clinicalCase: ClinicalCaseResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default clinicalCaseRoute;
