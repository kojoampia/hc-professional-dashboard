import { Routes } from '@angular/router';

import { Authority } from 'app/config/authority.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import { healthConnectRoleGuard } from './authority-role.guard';

const protectedFeatureRoute = {
  data: { authorities: [Authority.USER] },
  canActivate: [UserRouteAccessService, healthConnectRoleGuard],
};

const featurePage = (): Promise<typeof import('./pages/feature-page.component')> => import('./pages/feature-page.component');
const dashboardPage = (): Promise<typeof import('./pages/dashboard-page.component')> => import('./pages/dashboard-page.component');
const patientDirectoryPage = (): Promise<typeof import('./pages/patient-directory-page.component')> =>
  import('./pages/patient-directory-page.component');
const overlayHost = (): Promise<typeof import('./pages/route-driven-overlay-host.component')> =>
  import('./pages/route-driven-overlay-host.component');
const patientRecordPage = (): Promise<typeof import('./pages/patient-record-page.component')> =>
  import('./pages/patient-record-page.component');
const caseDetailPage = (): Promise<typeof import('./pages/case-detail-page.component')> => import('./pages/case-detail-page.component');

const routes: Routes = [
  {
    path: 'dashboard',
    ...protectedFeatureRoute,
    loadComponent: dashboardPage,
    data: { ...protectedFeatureRoute.data, titleKey: 'healthConnect.navigation.dashboard' },
  },
  {
    path: 'patients',
    ...protectedFeatureRoute,
    loadComponent: patientDirectoryPage,
    data: { ...protectedFeatureRoute.data, titleKey: 'healthConnect.patient.directory' },
  },
  {
    path: 'patients/:patientId',
    ...protectedFeatureRoute,
    loadComponent: overlayHost,
    data: {
      ...protectedFeatureRoute.data,
      titleKey: 'healthConnect.patient.record',
      closeUrl: '/patients',
    },
    children: [
      {
        path: '',
        loadComponent: patientRecordPage,
        data: { titleKey: 'healthConnect.patient.identity' },
      },
      {
        path: 'cases/:caseId',
        loadComponent: caseDetailPage,
        data: { titleKey: 'healthConnect.case.detail' },
      },
    ],
  },
  {
    path: 'cases',
    ...protectedFeatureRoute,
    loadComponent: featurePage,
    data: { ...protectedFeatureRoute.data, titleKey: 'healthConnect.case.queue' },
  },
  {
    path: 'cases/:caseId',
    ...protectedFeatureRoute,
    loadComponent: overlayHost,
    data: {
      ...protectedFeatureRoute.data,
      titleKey: 'healthConnect.case.detail',
      closeUrl: '/cases',
    },
    children: [{ path: '', loadComponent: caseDetailPage, data: { titleKey: 'healthConnect.case.detail' } }],
  },
  {
    path: 'duty-roster',
    ...protectedFeatureRoute,
    loadComponent: featurePage,
    data: { ...protectedFeatureRoute.data, titleKey: 'healthConnect.navigation.dutyRoster' },
  },
];

export default routes;
