import {
  AuthorityRole,
  ClinicalCase,
  DutyRoster,
  HealthConnectProfessional,
  PatientRecord,
  Recommendation,
} from '../health-connect.models';

export const HEALTH_CONNECT_PROFESSIONALS: readonly HealthConnectProfessional[] = [
  {
    id: 'professional-doctor',
    accountLogin: 'doctor',
    name: 'Dr. Ama Mensah',
    role: AuthorityRole.DOCTOR,
    dutyRosterIds: ['ward-3-night'],
  },
];

/**
 * Duty assignments, not rosters-with-subscribers.
 *
 * <p>These used to be `{ name, subscribedProfessionalIds, shifts[] }` — a subscription model neither
 * side ever built. DR1 replaced it with the assignment the backend actually stores: one professional,
 * one date, one shift. The ids are kept (`ward-3-night`, `clinic-a-day`) because the clinical-case
 * fixtures below reference them by `assignedRosterId`, and `health-connect.models.spec` asserts that
 * link resolves.
 *
 * <p>`clinic-a-day` belongs to nobody, which is what gives the specs a roster the doctor is *not* on.
 */
export const HEALTH_CONNECT_DUTY_ROSTERS: readonly DutyRoster[] = [
  {
    id: 'ward-3-night',
    date: '2026-07-20',
    duty: 'DOCTOR',
    professionalId: 'professional-doctor',
    shift: 'NIGHT',
    name: 'Ward 3 — Night Shift',
  },
  {
    id: 'clinic-a-day',
    date: '2026-07-21',
    duty: 'NURSE',
    professionalId: 'professional-nurse',
    shift: 'DAY',
    name: 'Clinic A — Day Shift',
  },
];

export const HEALTH_CONNECT_RECOMMENDATIONS: readonly Recommendation[] = [
  { id: 'hpv', label: 'HPV', category: 'screening' },
  { id: 'kidney-stones', label: 'Kidney stones', category: 'urology' },
  { id: 'x-ray', label: 'X-Ray', category: 'diagnostic' },
  { id: 'prostate-test', label: 'Prostate diagnosis test', category: 'urology' },
];

const clinicalCase = (
  id: string,
  patientId: string,
  openedAt: string,
  brief: string,
  status: ClinicalCase['status'],
  assignedRosterId = 'ward-3-night',
): ClinicalCase => ({
  id,
  patientId,
  openedAt,
  brief,
  status,
  symptoms: '',
  diagnosis: '',
  recommendationIds: [],
  assignedProfessionalId: 'professional-doctor',
  assignedRosterId,
});

export const HEALTH_CONNECT_PATIENT_RECORDS: readonly PatientRecord[] = [
  {
    patient: {
      id: 'patient-kojo',
      patientName: 'Kojo Ampia-Addison',
      lastActivityAt: '2022-05-21T05:43:00Z',
      sex: 'male',
      isChild: false,
      dateOfBirth: '1976-04-19',
      phone: '0242286304',
      email: 'kojo@jac.net',
      emergencyContact: { name: 'Ophelia Gaisie', phone: '0502286304' },
    },
    cases: [clinicalCase('case-kojo-urgent', 'patient-kojo', '2022-05-21T05:43:00Z', 'Severe pain due to a fall.', 'urgent')],
    visitations: [{ id: 'visit-kojo', occurredAt: '2022-05-20T10:00:00Z', label: 'Personal care visit' }],
    activities: [
      {
        id: 'activity-kojo',
        occurredAt: '2022-05-21T05:43:00Z',
        createdAt: '2022-05-21T05:43:00Z',
        title: 'Urea test recommended',
        description: 'Monitor results before the next consultation.',
        label: 'Urea test recommended',
      },
    ],
    medications: [{ id: 'medication-kojo', occurredAt: '2022-05-21T05:43:00Z', label: 'Urea prescription' }],
    reports: [{ id: 'report-kojo', occurredAt: '2021-12-12T10:00:00Z', label: 'Lab test report for Urea', reportType: 'lab' }],
  },
  {
    patient: {
      id: 'patient-kwabena',
      patientName: 'Kwabena Adda Frimpong',
      lastActivityAt: '2022-05-19T20:20:00Z',
      sex: 'male',
      isChild: false,
      dateOfBirth: '1982-11-01',
      phone: '0200000001',
      email: 'kwabena@example.test',
    },
    cases: [clinicalCase('case-kwabena-open', 'patient-kwabena', '2022-05-19T20:20:00Z', 'High fever temperature recorded', 'open')],
    visitations: [],
    activities: [],
    medications: [],
    reports: [],
  },
  {
    patient: {
      id: 'patient-nii',
      patientName: 'Nii Adjei Osae',
      lastActivityAt: '2022-04-14T07:12:00Z',
      sex: 'male',
      isChild: false,
      dateOfBirth: '1990-03-14',
      phone: '0200000002',
      email: 'nii@example.test',
    },
    cases: [clinicalCase('case-nii-closed', 'patient-nii', '2022-04-14T07:12:00Z', 'Follow-up consultation completed', 'closed')],
    visitations: [],
    activities: [],
    medications: [],
    reports: [],
  },
  {
    patient: {
      id: 'patient-ama',
      patientName: 'Ama Serwaa',
      lastActivityAt: '2022-04-12T09:00:00Z',
      sex: 'female',
      isChild: false,
      dateOfBirth: '1988-06-05',
      phone: '0200000003',
      email: 'ama@example.test',
    },
    cases: [clinicalCase('case-ama-urgent', 'patient-ama', '2022-04-12T09:00:00Z', 'Shortness of breath reported', 'urgent')],
    visitations: [],
    activities: [],
    medications: [],
    reports: [],
  },
  {
    patient: {
      id: 'patient-adwoa',
      patientName: 'Adwoa Kusi',
      lastActivityAt: '2022-04-10T11:00:00Z',
      sex: 'female',
      isChild: false,
      dateOfBirth: '1979-07-18',
      phone: '0200000004',
      email: 'adwoa@example.test',
    },
    cases: [clinicalCase('case-adwoa-open', 'patient-adwoa', '2022-04-10T11:00:00Z', 'Medication review required', 'open')],
    visitations: [],
    activities: [],
    medications: [],
    reports: [],
  },
  {
    patient: {
      id: 'patient-yaw',
      patientName: 'Yaw Mensah',
      lastActivityAt: '2022-04-08T13:00:00Z',
      sex: 'male',
      isChild: true,
      dateOfBirth: '2016-02-11',
      phone: '0200000005',
      email: 'yaw@example.test',
    },
    cases: [clinicalCase('case-yaw-closed', 'patient-yaw', '2022-04-08T13:00:00Z', 'Vaccination record reviewed', 'closed')],
    visitations: [],
    activities: [],
    medications: [],
    reports: [],
  },
  {
    patient: {
      id: 'patient-akosua',
      patientName: 'Akosua Boateng',
      lastActivityAt: '2022-04-07T08:00:00Z',
      sex: 'female',
      isChild: true,
      dateOfBirth: '2015-10-30',
      phone: '0200000006',
      email: 'akosua@example.test',
    },
    cases: [clinicalCase('case-akosua-closed', 'patient-akosua', '2022-04-07T08:00:00Z', 'Wellness assessment completed', 'closed')],
    visitations: [],
    activities: [],
    medications: [],
    reports: [],
  },
];
