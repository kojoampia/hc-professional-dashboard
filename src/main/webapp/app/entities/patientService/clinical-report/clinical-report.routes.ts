import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import ClinicalReportResolve from './route/clinical-report-routing-resolve.service';

const clinicalReportRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/clinical-report').then(m => m.ClinicalReportComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/clinical-report-detail').then(m => m.ClinicalReportDetailComponent),
    resolve: {
      clinicalReport: ClinicalReportResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/clinical-report-update').then(m => m.ClinicalReportUpdateComponent),
    resolve: {
      clinicalReport: ClinicalReportResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/clinical-report-update').then(m => m.ClinicalReportUpdateComponent),
    resolve: {
      clinicalReport: ClinicalReportResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default clinicalReportRoute;
