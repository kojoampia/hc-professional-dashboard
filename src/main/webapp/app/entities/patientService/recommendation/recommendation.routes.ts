import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import RecommendationResolve from './route/recommendation-routing-resolve.service';

const recommendationRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/recommendation').then(m => m.RecommendationComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/recommendation-detail').then(m => m.RecommendationDetailComponent),
    resolve: {
      recommendation: RecommendationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/recommendation-update').then(m => m.RecommendationUpdateComponent),
    resolve: {
      recommendation: RecommendationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/recommendation-update').then(m => m.RecommendationUpdateComponent),
    resolve: {
      recommendation: RecommendationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default recommendationRoute;
