import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ASC } from 'app/config/navigation.constants';
import { HCPayOptionComponent } from './list/hc-pay-option.component';
import { HCPayOptionDetailComponent } from './detail/hc-pay-option-detail.component';
import { HCPayOptionUpdateComponent } from './update/hc-pay-option-update.component';
import HCPayOptionResolve from './route/hc-pay-option-routing-resolve.service';

const hCPayOptionRoute: Routes = [
  {
    path: '',
    component: HCPayOptionComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: HCPayOptionDetailComponent,
    resolve: {
      hCPayOption: HCPayOptionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: HCPayOptionUpdateComponent,
    resolve: {
      hCPayOption: HCPayOptionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: HCPayOptionUpdateComponent,
    resolve: {
      hCPayOption: HCPayOptionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default hCPayOptionRoute;
