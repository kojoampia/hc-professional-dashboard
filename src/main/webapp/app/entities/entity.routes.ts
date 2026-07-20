import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'address',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceAddress.home.title' },
    loadChildren: () => import('./professionalService/address/address.routes'),
  },
  {
    path: 'team',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceTeam.home.title' },
    loadChildren: () => import('./professionalService/team/team.routes'),
  },
  {
    path: 'task',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceTask.home.title' },
    loadChildren: () => import('./professionalService/task/task.routes'),
  },
  {
    path: 'membership',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceMembership.home.title' },
    loadChildren: () => import('./professionalService/membership/membership.routes'),
  },
  {
    path: 'report',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceReport.home.title' },
    loadChildren: () => import('./professionalService/report/report.routes'),
  },
  {
    path: 'metadata',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceMetadata.home.title' },
    loadChildren: () => import('./professionalService/metadata/metadata.routes'),
  },
  {
    path: 'profile',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceProfile.home.title' },
    loadChildren: () => import('./professionalService/profile/profile.routes'),
  },
  {
    path: 'document',
    data: { pageTitle: 'professionalDashboardApp.hcprofessionalServiceDocument.home.title' },
    loadChildren: () => import('./professionalService/document/document.routes'),
  },
  /* jhipster-needle-add-entity-route - JHipster will add entity modules routes here */
];

export default routes;
