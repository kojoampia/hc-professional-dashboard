import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { ASC } from 'app/config/navigation.constants';
import { MetadataComponent } from './list/metadata.component';
import { MetadataDetailComponent } from './detail/metadata-detail.component';
import { MetadataUpdateComponent } from './update/metadata-update.component';
import MetadataResolve from './route/metadata-routing-resolve.service';

const metadataRoute: Routes = [
  {
    path: '',
    component: MetadataComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: MetadataDetailComponent,
    resolve: {
      metadata: MetadataResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: MetadataUpdateComponent,
    resolve: {
      metadata: MetadataResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: MetadataUpdateComponent,
    resolve: {
      metadata: MetadataResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default metadataRoute;
