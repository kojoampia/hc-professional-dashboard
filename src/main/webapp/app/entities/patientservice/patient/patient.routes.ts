import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import PatientResolve from './route/patient-routing-resolve.service';

const patientRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/patient').then(m => m.PatientComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/patient-detail').then(m => m.PatientDetailComponent),
    resolve: {
      patient: PatientResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/patient-update').then(m => m.PatientUpdateComponent),
    resolve: {
      patient: PatientResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/patient-update').then(m => m.PatientUpdateComponent),
    resolve: {
      patient: PatientResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default patientRoute;
