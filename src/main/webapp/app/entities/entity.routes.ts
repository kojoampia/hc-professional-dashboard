import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'address',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceAddress.home.title' },
    loadChildren: () => import('./professionalService/address/address.routes'),
  },
  {
    path: 'medication',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceMedication.home.title' },
    loadChildren: () => import('./professionalService/medication/medication.routes'),
  },
  {
    path: 'stat',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceStat.home.title' },
    loadChildren: () => import('./professionalService/stat/stat.routes'),
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
    data: { pageTitle: 'professionalDashboardApp.professionalServiceDocument.home.title' },
    loadChildren: () => import('./professionalService/document/document.routes'),
  },
  {
    path: 'activity',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceActivity.home.title' },
    loadChildren: () => import('./professionalService/activity/activity.routes'),
  },
  {
    path: 'duty-roster',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceDutyRoster.home.title' },
    loadChildren: () => import('./professionalService/duty-roster/duty-roster.routes'),
  },
  {
    path: 'duty-shift',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceDutyShift.home.title' },
    loadChildren: () => import('./professionalService/duty-shift/duty-shift.routes'),
  },
  {
    path: 'health-connect-professional',
    data: { pageTitle: 'professionalDashboardApp.professionalServiceHealthConnectProfessional.home.title' },
    loadChildren: () => import('./professionalService/health-connect-professional/health-connect-professional.routes'),
  },
  {
    path: 'recommendation',
    data: { pageTitle: 'professionalDashboardApp.patientServiceRecommendation.home.title' },
    loadChildren: () => import('./patientService/recommendation/recommendation.routes'),
  },
  {
    path: 'visitation',
    data: { pageTitle: 'professionalDashboardApp.patientServiceVisitation.home.title' },
    loadChildren: () => import('./patientService/visitation/visitation.routes'),
  },
  {
    path: 'medication-record',
    data: { pageTitle: 'professionalDashboardApp.patientServiceMedicationRecord.home.title' },
    loadChildren: () => import('./patientService/medication-record/medication-record.routes'),
  },
  {
    path: 'activity-log-entry',
    data: { pageTitle: 'professionalDashboardApp.patientServiceActivityLogEntry.home.title' },
    loadChildren: () => import('./patientService/activity-log-entry/activity-log-entry.routes'),
  },
  {
    path: 'clinical-report',
    data: { pageTitle: 'professionalDashboardApp.patientServiceClinicalReport.home.title' },
    loadChildren: () => import('./patientService/clinical-report/clinical-report.routes'),
  },
  {
    path: 'patient',
    data: { pageTitle: 'professionalDashboardApp.patientServicePatient.home.title' },
    loadChildren: () => import('./patientService/patient/patient.routes'),
  },
  {
    path: 'clinical-case',
    data: { pageTitle: 'professionalDashboardApp.patientServiceClinicalCase.home.title' },
    loadChildren: () => import('./patientService/clinical-case/clinical-case.routes'),
  },
  /* jhipster-needle-add-entity-route - JHipster will add entity modules routes here */
];

export default routes;
