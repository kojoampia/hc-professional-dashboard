import { Routes } from '@angular/router';
/* jhipster-needle-add-admin-module-import - JHipster will add admin modules imports here */

const routes: Routes = [
  {
    path: 'health',
    loadComponent: () => import('./health/health.component'),
    title: 'health.title',
  },
  {
    path: 'metrics',
    loadComponent: () => import('./metrics/metrics.component'),
    title: 'metrics.title',
  },
  /* jhipster-needle-add-admin-route - JHipster will add admin routes here */
];

export default routes;
