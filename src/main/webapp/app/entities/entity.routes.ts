import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'address',
    data: { pageTitle: 'professionalDashboardApp.professionalMsAddress.home.title' },
    loadChildren: () => import('./professionalMS/address/address.routes'),
  },
  {
    path: 'team',
    data: { pageTitle: 'professionalDashboardApp.professionalMsTeam.home.title' },
    loadChildren: () => import('./professionalMS/team/team.routes'),
  },
  {
    path: 'task',
    data: { pageTitle: 'professionalDashboardApp.professionalMsTask.home.title' },
    loadChildren: () => import('./professionalMS/task/task.routes'),
  },
  {
    path: 'membership',
    data: { pageTitle: 'professionalDashboardApp.professionalMsMembership.home.title' },
    loadChildren: () => import('./professionalMS/membership/membership.routes'),
  },
  {
    path: 'report',
    data: { pageTitle: 'professionalDashboardApp.professionalMsReport.home.title' },
    loadChildren: () => import('./professionalMS/report/report.routes'),
  },
  {
    path: 'metadata',
    data: { pageTitle: 'professionalDashboardApp.professionalMsMetadata.home.title' },
    loadChildren: () => import('./professionalMS/metadata/metadata.routes'),
  },
  {
    path: 'profile',
    data: { pageTitle: 'professionalDashboardApp.professionalMsProfile.home.title' },
    loadChildren: () => import('./professionalMS/profile/profile.routes'),
  },
  {
    path: 'document',
    data: { pageTitle: 'professionalDashboardApp.hcProfessionalMsDocument.home.title' },
    loadChildren: () => import('./professionalMS/document/document.routes'),
  },
  /* jhipster-needle-add-entity-route - JHipster will add entity modules routes here */
];

export default routes;
