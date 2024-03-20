import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ASC } from 'app/config/navigation.constants';
import { ConditionComponent } from './list/condition.component';
import { ConditionDetailComponent } from './detail/condition-detail.component';
import { ConditionUpdateComponent } from './update/condition-update.component';
import ConditionResolve from './route/condition-routing-resolve.service';

const conditionRoute: Routes = [
  {
    path: '',
    component: ConditionComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: ConditionDetailComponent,
    resolve: {
      condition: ConditionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: ConditionUpdateComponent,
    resolve: {
      condition: ConditionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: ConditionUpdateComponent,
    resolve: {
      condition: ConditionResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default conditionRoute;
