import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import HealthConnectProfessionalResolve from './route/health-connect-professional-routing-resolve.service';

const healthConnectProfessionalRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/health-connect-professional').then(m => m.HealthConnectProfessionalComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/health-connect-professional-detail').then(m => m.HealthConnectProfessionalDetailComponent),
    resolve: {
      healthConnectProfessional: HealthConnectProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/health-connect-professional-update').then(m => m.HealthConnectProfessionalUpdateComponent),
    resolve: {
      healthConnectProfessional: HealthConnectProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/health-connect-professional-update').then(m => m.HealthConnectProfessionalUpdateComponent),
    resolve: {
      healthConnectProfessional: HealthConnectProfessionalResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default healthConnectProfessionalRoute;
