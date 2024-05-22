import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ASC } from 'app/config/navigation.constants';
import { ProfileComponent } from './list/profile.component';
import { ProfileDetailComponent } from './detail/profile-detail.component';
import { ProfileUpdateComponent } from './update/profile-update.component';
import ProfileResolve from './route/profile-routing-resolve.service';

const profileRoute: Routes = [
  {
    path: '',
    component: ProfileComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: ProfileDetailComponent,
    resolve: {
      profile: ProfileResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: ProfileUpdateComponent,
    resolve: {
      profile: ProfileResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: ProfileUpdateComponent,
    resolve: {
      profile: ProfileResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default profileRoute;
