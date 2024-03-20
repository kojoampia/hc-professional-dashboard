import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ASC } from 'app/config/navigation.constants';
import { MedicationComponent } from './list/medication.component';
import { MedicationDetailComponent } from './detail/medication-detail.component';
import { MedicationUpdateComponent } from './update/medication-update.component';
import MedicationResolve from './route/medication-routing-resolve.service';

const medicationRoute: Routes = [
  {
    path: '',
    component: MedicationComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: MedicationDetailComponent,
    resolve: {
      medication: MedicationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: MedicationUpdateComponent,
    resolve: {
      medication: MedicationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: MedicationUpdateComponent,
    resolve: {
      medication: MedicationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default medicationRoute;
