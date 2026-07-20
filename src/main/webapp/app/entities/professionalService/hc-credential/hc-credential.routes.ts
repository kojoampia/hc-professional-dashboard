import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ASC } from 'app/config/navigation.constants';
import { HCCredentialComponent } from './list/hc-credential.component';
import { HCCredentialDetailComponent } from './detail/hc-credential-detail.component';
import { HCCredentialUpdateComponent } from './update/hc-credential-update.component';
import HCCredentialResolve from './route/hc-credential-routing-resolve.service';

const hCCredentialRoute: Routes = [
  {
    path: '',
    component: HCCredentialComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: HCCredentialDetailComponent,
    resolve: {
      hCCredential: HCCredentialResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: HCCredentialUpdateComponent,
    resolve: {
      hCCredential: HCCredentialResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: HCCredentialUpdateComponent,
    resolve: {
      hCCredential: HCCredentialResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default hCCredentialRoute;
