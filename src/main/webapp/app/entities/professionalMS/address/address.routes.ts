import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ASC } from 'app/config/navigation.constants';
import { AddressComponent } from './list/address.component';
import { AddressDetailComponent } from './detail/address-detail.component';
import { AddressUpdateComponent } from './update/address-update.component';
import AddressResolve from './route/address-routing-resolve.service';

const addressRoute: Routes = [
  {
    path: '',
    component: AddressComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: AddressDetailComponent,
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: AddressUpdateComponent,
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: AddressUpdateComponent,
    resolve: {
      address: AddressResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default addressRoute;
