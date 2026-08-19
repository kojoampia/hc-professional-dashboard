import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'address',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceAddress.home.title' },
    loadChildren: () => import('./professionalservice/address/address.routes'),
  },
  {
    path: 'medication',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceMedication.home.title' },
    loadChildren: () => import('./professionalservice/medication/medication.routes'),
  },
  {
    path: 'stat',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceStat.home.title' },
    loadChildren: () => import('./professionalservice/stat/stat.routes'),
  },
  {
    path: 'team',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceTeam.home.title' },
    loadChildren: () => import('./professionalservice/team/team.routes'),
  },
  {
    path: 'task',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceTask.home.title' },
    loadChildren: () => import('./professionalservice/task/task.routes'),
  },
  {
    path: 'report',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceReport.home.title' },
    loadChildren: () => import('./professionalservice/report/report.routes'),
  },
  {
    path: 'metadata',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceMetadata.home.title' },
    loadChildren: () => import('./professionalservice/metadata/metadata.routes'),
  },
  {
    path: 'profile',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceProfile.home.title' },
    loadChildren: () => import('./professionalservice/profile/profile.routes'),
  },
  {
    path: 'document',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceDocument.home.title' },
    loadChildren: () => import('./professionalservice/document/document.routes'),
  },
  {
    path: 'activity',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceActivity.home.title' },
    loadChildren: () => import('./professionalservice/activity/activity.routes'),
  },
  {
    path: 'entities/duty-roster',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceDutyRoster.home.title' },
    loadChildren: () => import('./professionalservice/duty-roster/duty-roster.routes'),
  },
  {
    path: 'duty-shift',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceDutyShift.home.title' },
    loadChildren: () => import('./professionalservice/duty-shift/duty-shift.routes'),
  },
  {
    path: 'health-connect-professional',
    data: { pageTitle: 'professionalDashboardApp.professionalserviceHealthConnectProfessional.home.title' },
    loadChildren: () => import('./professionalservice/health-connect-professional/health-connect-professional.routes'),
  },
  {
    path: 'recommendation',
    data: { pageTitle: 'professionalDashboardApp.patientserviceRecommendation.home.title' },
    loadChildren: () => import('./patientservice/recommendation/recommendation.routes'),
  },
  {
    path: 'visitation',
    data: { pageTitle: 'professionalDashboardApp.patientserviceVisitation.home.title' },
    loadChildren: () => import('./patientservice/visitation/visitation.routes'),
  },
  {
    path: 'medication-record',
    data: { pageTitle: 'professionalDashboardApp.patientserviceMedicationRecord.home.title' },
    loadChildren: () => import('./patientservice/medication-record/medication-record.routes'),
  },
  {
    path: 'activity-log-entry',
    data: { pageTitle: 'professionalDashboardApp.patientserviceActivityLogEntry.home.title' },
    loadChildren: () => import('./patientservice/activity-log-entry/activity-log-entry.routes'),
  },
  {
    path: 'clinical-report',
    data: { pageTitle: 'professionalDashboardApp.patientserviceClinicalReport.home.title' },
    loadChildren: () => import('./patientservice/clinical-report/clinical-report.routes'),
  },
  {
    path: 'patient',
    data: { pageTitle: 'professionalDashboardApp.patientservicePatient.home.title' },
    loadChildren: () => import('./patientservice/patient/patient.routes'),
  },
  {
    path: 'clinical-case',
    data: { pageTitle: 'professionalDashboardApp.patientserviceClinicalCase.home.title' },
    loadChildren: () => import('./patientservice/clinical-case/clinical-case.routes'),
  },
  /* jhipster-needle-add-entity-route - JHipster will add entity modules routes here */
];

export default routes;
