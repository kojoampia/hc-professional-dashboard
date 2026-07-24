import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'med-case',
    data: { pageTitle: 'professionalDashboardApp.hcPatientServiceMedCase.home.title' },
    loadChildren: () => import('./patientService/med-case/med-case.routes'),
  },
  /* jhipster-needle-add-entity-route - JHipster will add entity modules routes here */
];

export default routes;
