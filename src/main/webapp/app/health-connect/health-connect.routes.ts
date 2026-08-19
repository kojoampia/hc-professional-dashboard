import { Routes } from '@angular/router';

import { Authority } from 'app/config/authority.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import { healthConnectRoleGuard } from './authority-role.guard';

const protectedFeatureRoute = {
  data: {
    authorities: [
      Authority.ADMIN,
      Authority.DOCTOR,
      Authority.USER,
      Authority.NURSE,
      Authority.PARAMEDIC,
      Authority.PHARMACIST,
      Authority.THERAPIST,
      Authority.CARER,
      Authority.ANGEL,
      Authority.CHEMIST,
      Authority.TECHNICIAN,
    ],
  },
  canActivate: [UserRouteAccessService, healthConnectRoleGuard],
};

const dashboardPage = (): Promise<typeof import('./pages/dashboard-page.component')> => import('./pages/dashboard-page.component');
const patientDirectoryPage = (): Promise<typeof import('./pages/patient-directory-page.component')> =>
  import('./pages/patient-directory-page.component');
const overlayHost = (): Promise<typeof import('./pages/route-driven-overlay-host.component')> =>
  import('./pages/route-driven-overlay-host.component');
const patientRecordPage = (): Promise<typeof import('./pages/patient-record-page.component')> =>
  import('./pages/patient-record-page.component');
const caseDetailPage = (): Promise<typeof import('./pages/case-detail-page.component')> => import('./pages/case-detail-page.component');
const caseQueuePage = (): Promise<typeof import('./pages/case-queue-page.component')> => import('./pages/case-queue-page.component');
const dutyRosterPage = (): Promise<typeof import('./pages/duty-roster-page.component')> => import('./pages/duty-roster-page.component');
const earningsPage = (): Promise<typeof import('./pages/earnings-page.component')> => import('./pages/earnings-page.component');
const reviewQueuePage = (): Promise<typeof import('./pages/review-queue-page.component')> => import('./pages/review-queue-page.component');
const reviewDetailPage = (): Promise<typeof import('./pages/review-detail-page.component')> =>
  import('./pages/review-detail-page.component');
const compliancePage = (): Promise<typeof import('./pages/compliance-page.component')> => import('./pages/compliance-page.component');
const messagesPage = (): Promise<typeof import('./pages/messages-page.component')> => import('./pages/messages-page.component');

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
    loadComponent: caseQueuePage,
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
    loadComponent: dutyRosterPage,
    data: { ...protectedFeatureRoute.data, titleKey: 'healthConnect.navigation.dutyRoster' },
  },
  {
    // Every clinical role, including the four that are read-only elsewhere: earnings are a
    // professional's own record of their own work, and nothing on this surface mutates anything.
    path: 'earnings',
    ...protectedFeatureRoute,
    loadComponent: earningsPage,
    data: { ...protectedFeatureRoute.data, titleKey: 'healthConnect.earnings.title' },
  },
  {
    path: 'review',
    data: { authorities: [Authority.ADMIN], titleKey: 'healthConnect.review.title' },
    canActivate: [UserRouteAccessService],
    loadComponent: reviewQueuePage,
  },
  {
    path: 'review/:id',
    data: { authorities: [Authority.ADMIN], titleKey: 'healthConnect.review.detail' },
    canActivate: [UserRouteAccessService],
    loadComponent: reviewDetailPage,
  },
  {
    path: 'compliance',
    data: { authorities: [Authority.ADMIN], titleKey: 'healthConnect.compliance.title' },
    canActivate: [UserRouteAccessService],
    loadComponent: compliancePage,
  },
  {
    path: 'messages',
    ...protectedFeatureRoute,
    loadComponent: messagesPage,
    data: { ...protectedFeatureRoute.data, titleKey: 'healthConnect.navigation.messages' },
  },
];

export default routes;
