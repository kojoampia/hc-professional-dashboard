import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import VisitationResolve from './route/visitation-routing-resolve.service';

const visitationRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/visitation').then(m => m.VisitationComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/visitation-detail').then(m => m.VisitationDetailComponent),
    resolve: {
      visitation: VisitationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/visitation-update').then(m => m.VisitationUpdateComponent),
    resolve: {
      visitation: VisitationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/visitation-update').then(m => m.VisitationUpdateComponent),
    resolve: {
      visitation: VisitationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default visitationRoute;
