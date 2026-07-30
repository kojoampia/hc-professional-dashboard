import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import AddressResolve from './route/address-routing-resolve.service';

const addressRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/address').then(m => m.AddressComponent),
    data: {},
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/address-detail').then(m => m.AddressDetailComponent),
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/address-update').then(m => m.AddressUpdateComponent),
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/address-update').then(m => m.AddressUpdateComponent),
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default addressRoute;
