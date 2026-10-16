import { Routes } from '@angular/router';

import { Authority } from 'app/config/authority.constants';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import { WIZARD_PANES, wizardPaneRoute } from 'app/onboarding/wizard.service';

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

/** T8's four onboarding panes, each its own routed overlay over the dashboard. */
const onboardingOverlayHost = (): Promise<typeof import('app/onboarding/onboarding-overlay.component')> =>
  import('app/onboarding/onboarding-overlay.component');
const userUpdate = (): Promise<typeof import('app/account/user/user-update.component')> => import('app/account/user/user-update.component');
const profileUpdate = (): Promise<typeof import('app/entities/profile/profile-update.component')> =>
  import('app/entities/profile/profile-update.component');
const personalDocumentUpdate = (): Promise<typeof import('app/entities/personal-document/personal-document-update.component')> =>
  import('app/entities/personal-document/personal-document-update.component');
const applicationUpdate = (): Promise<typeof import('app/entities/application/application-update.component')> =>
  import('app/entities/application/application-update.component');

const wizardPane = {
  account: userUpdate,
  profile: profileUpdate,
  documents: personalDocumentUpdate,
  application: applicationUpdate,
};

/**
 * The onboarding wizard's four panes — `profile.md` § "Onboarding Wizard", T8.
 *
 * <p>**Children of `dashboard`, because `profile.md:171-173` opens step 1's dialog "over the
 * dashboard"** and because the overlay idiom below makes the overlay a child of the page it overlays:
 * the page stays mounted and renders underneath, which is what a modal is supposed to mean. The four
 * are **siblings**, each with its own overlay host, so each carries its own title and each is a URL
 * the browser's back button steps between — which is `profile.md:166`'s *"it should be possible to
 * navigate back to a previous step and make changes"*, answered by the router rather than by state.
 *
 * <p>⚠ **Built from {@link WIZARD_PANES} rather than written out four times**, so the sequence has
 * one declaration: the service's order, the footer's step counter, the sidebar's destination and
 * these routes all read it. A fifth pane is one entry in that array plus a component.
 *
 * <p>⛔ **Gated as `protectedFeatureRoute`, which admits `Authority.USER`** — and that is the whole
 * reason onboarding can live inside the portal. An applicant holds `ROLE_USER` and nothing else until
 * an administrator assigns a discipline. These four must not be narrowed to clinical roles, or the
 * people the wizard exists for are the only ones who cannot reach it.
 *
 * <p>⛔ **This said "every other clinical surface refuses them", and AT THE ROUTE LAYER THAT IS
 * FALSE** — measured in review: a `ROLE_USER`-only account resolves `/dashboard`, `/patients`,
 * `/cases` and `/duty-roster` too, because `protectedFeatureRoute` lists `Authority.USER` for all of
 * them. What actually refuses an applicant is **elsewhere**: `api/`'s chain answers **403** on the
 * reads those pages make, and the sidebar's `clinicalOnly` hides the group so they are not offered.
 * ⚠ The sentence is corrected rather than deleted because the conclusion it was supporting still
 * holds — these panes need `USER` — but **nobody may delete a server-side check or the sidebar's
 * hiding on the strength of a route table**. Route authorities here decide what *renders*, not what
 * is *permitted*.
 *
 * <p>⚠ **Not the top-level `/onboarding`.** That path has no component and redirects to pane 1
 * through `wizardPanePath` (T6, re-pointed off the retired tab page); it is the activation email's
 * landing spot. Nothing here collides with it.
 */
const wizardRoutes: Routes = WIZARD_PANES.map(pane => ({
  path: wizardPaneRoute(pane),
  // ⛔ onboardingOverlayHost, NOT the overlayHost the record and case routes below use — backlog.md
  // row 247. That shared host renders Close and Print, which profile.md:162 forbids the wizard
  // ("The dialog panel cannot be closed or printed"), and it reached these routes because the
  // routed-overlay idiom was reused wholesale when T8 built the panes. The replacement keeps the
  // dialog semantics and the focus trap and drops the two controls; see its own docblock for why it
  // is a second component rather than a flag on the first.
  loadComponent: onboardingOverlayHost,
  data: {
    titleKey: `healthConnect.onboarding.wizard.${pane}.title`,
    // ⚠ No closeUrl, and its absence is the change rather than an omission: there is no close
    // button left to send anywhere. The footer's Back is what moves between panes, and row 250 is
    // what will decide when the dashboard underneath becomes reachable at all.
  },
  children: [
    {
      path: '',
      loadComponent: wizardPane[pane],
      data: { titleKey: `healthConnect.onboarding.wizard.${pane}.title` },
    },
  ],
}));

const routes: Routes = [
  {
    path: 'dashboard',
    ...protectedFeatureRoute,
    loadComponent: dashboardPage,
    data: { ...protectedFeatureRoute.data, titleKey: 'healthConnect.navigation.dashboard' },
    children: wizardRoutes,
  },
  /**
   * The two list surfaces and their record overlays.
   *
   * <p><b>The overlay is a CHILD of its list, not a sibling of it.</b> While they were siblings,
   * opening a record unmounted the list that opened it: the queue vanished behind the modal, its
   * scroll position was lost, and closing rebuilt it from scratch. Nesting keeps the list mounted
   * and rendering underneath, which is what a modal is supposed to mean — the overlay itself is
   * {@code position: fixed}, so it still covers the page from wherever the outlet sits in the DOM.
   *
   * <p>Do not flatten these back. The list component holds the filter state that the query string
   * drives, and a component that is destroyed on every record view cannot hold anything.
   */
  {
    path: 'patients',
    ...protectedFeatureRoute,
    loadComponent: patientDirectoryPage,
    data: { ...protectedFeatureRoute.data, titleKey: 'healthConnect.patient.directory' },
    children: [
      {
        path: ':patientId',
        loadComponent: overlayHost,
        data: {
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
    ],
  },
  {
    path: 'cases',
    ...protectedFeatureRoute,
    loadComponent: caseQueuePage,
    data: { ...protectedFeatureRoute.data, titleKey: 'healthConnect.case.queue' },
    children: [
      {
        path: ':caseId',
        loadComponent: overlayHost,
        data: {
          titleKey: 'healthConnect.case.detail',
          closeUrl: '/cases',
        },
        children: [{ path: '', loadComponent: caseDetailPage, data: { titleKey: 'healthConnect.case.detail' } }],
      },
    ],
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
