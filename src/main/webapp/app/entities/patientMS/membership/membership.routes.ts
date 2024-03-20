import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ASC } from 'app/config/navigation.constants';
import { MembershipComponent } from './list/membership.component';
import { MembershipDetailComponent } from './detail/membership-detail.component';
import { MembershipUpdateComponent } from './update/membership-update.component';
import MembershipResolve from './route/membership-routing-resolve.service';

const membershipRoute: Routes = [
  {
    path: '',
    component: MembershipComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: MembershipDetailComponent,
    resolve: {
      membership: MembershipResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: MembershipUpdateComponent,
    resolve: {
      membership: MembershipResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: MembershipUpdateComponent,
    resolve: {
      membership: MembershipResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default membershipRoute;
