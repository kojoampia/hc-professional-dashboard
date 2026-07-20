import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ASC } from 'app/config/navigation.constants';
import { StatComponent } from './list/stat.component';
import { StatDetailComponent } from './detail/stat-detail.component';
import { StatUpdateComponent } from './update/stat-update.component';
import StatResolve from './route/stat-routing-resolve.service';

const statRoute: Routes = [
  {
    path: '',
    component: StatComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: StatDetailComponent,
    resolve: {
      stat: StatResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: StatUpdateComponent,
    resolve: {
      stat: StatResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: StatUpdateComponent,
    resolve: {
      stat: StatResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default statRoute;
