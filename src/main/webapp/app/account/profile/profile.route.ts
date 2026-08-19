import { Route } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import ProfilePageComponent from './profile-page.component';

const profileRoute: Route = {
  path: 'profile',
  component: ProfilePageComponent,
  title: 'healthConnect.profile.title',
  canActivate: [UserRouteAccessService],
};

export default profileRoute;
