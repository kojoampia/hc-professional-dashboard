import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import StatResolve from './route/stat-routing-resolve.service';

const statRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/stat').then(m => m.StatComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/stat-detail').then(m => m.StatDetailComponent),
    resolve: {
      stat: StatResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/stat-update').then(m => m.StatUpdateComponent),
    resolve: {
      stat: StatResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/stat-update').then(m => m.StatUpdateComponent),
    resolve: {
      stat: StatResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default statRoute;
