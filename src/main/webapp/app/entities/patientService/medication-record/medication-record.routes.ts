import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import MedicationRecordResolve from './route/medication-record-routing-resolve.service';

const medicationRecordRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/medication-record').then(m => m.MedicationRecordComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/medication-record-detail').then(m => m.MedicationRecordDetailComponent),
    resolve: {
      medicationRecord: MedicationRecordResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/medication-record-update').then(m => m.MedicationRecordUpdateComponent),
    resolve: {
      medicationRecord: MedicationRecordResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/medication-record-update').then(m => m.MedicationRecordUpdateComponent),
    resolve: {
      medicationRecord: MedicationRecordResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default medicationRecordRoute;
