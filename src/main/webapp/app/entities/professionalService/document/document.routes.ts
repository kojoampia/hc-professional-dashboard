import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import DocumentResolve from './route/document-routing-resolve.service';

const documentRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/document').then(m => m.DocumentComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/document-detail').then(m => m.DocumentDetailComponent),
    resolve: {
      document: DocumentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/document-update').then(m => m.DocumentUpdateComponent),
    resolve: {
      document: DocumentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/document-update').then(m => m.DocumentUpdateComponent),
    resolve: {
      document: DocumentResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default documentRoute;
