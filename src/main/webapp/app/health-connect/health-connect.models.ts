export type IsoDateTime = string;

export enum AuthorityRole {
  ADMIN = 'Admin',
  DOCTOR = 'Doctor',
  NURSE = 'Nurse',
  PARAMEDIC = 'Paramedic',
  PHARMACIST = 'Pharmacist',
  THERAPIST = 'Therapist',
  CARER = 'Carer',
  USER = 'User',
}

export type DutyShiftStatus = 'upcoming' | 'active' | 'completed';
export type CaseStatus = 'urgent' | 'open' | 'closed';
export type PatientSex = 'female' | 'male' | 'unspecified';
export type RosterScope = 'all' | 'mine';
export type AsyncStatus = 'idle' | 'loading' | 'error' | 'ready';

export interface HealthConnectProfessional {
  id: string;
  accountLogin?: string;
  name: string;
  role: AuthorityRole;
  dutyRosterIds: string[];
}

export interface DutyShift {
  id: string;
  rosterId: string;
  professionalId: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  status: DutyShiftStatus;
}

export interface DutyRoster {
  id: string;
  name: string;
  subscribedProfessionalIds: string[];
  shifts: DutyShift[];
}

export interface ShiftLabel {
  translationKey: 'healthConnect.roster.activeShift' | 'healthConnect.roster.nextShift';
  translationParams: { time: string };
}

export interface PatientListRow {
  id: string;
  patientName: string;
  lastActivityAt: IsoDateTime;
  sex: PatientSex;
  isChild: boolean;
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface PatientIdentity {
  dateOfBirth: string;
  phone: string;
  email: string;
  emergencyContact?: EmergencyContact;
  avatarUrl?: string;
}

export interface RecordEntry {
  id: string;
  occurredAt: IsoDateTime;
  label: string;
}

export interface ActivityLogEntry extends RecordEntry {
  title: string;
  description: string;
  createdAt: IsoDateTime;
}

export interface ClinicalReport extends RecordEntry {
  reportType: string;
  url?: string;
}

export interface Recommendation {
  id: string;
  label: string;
  category?: string;
}

export interface ClinicalCase {
  id: string;
  patientId: string;
  openedAt: IsoDateTime;
  brief: string;
  status: CaseStatus;
  symptoms: string;
  diagnosis: string;
  recommendationIds: string[];
  assignedProfessionalId?: string;
  assignedRosterId?: string;
}

export interface CaseQueueRow {
  id: string;
  patientId: string;
  date: IsoDateTime;
  brief: string;
  status: CaseStatus;
  assignedProfessionalId?: string;
  assignedRosterId?: string;
}

export interface PatientRecord {
  patient: PatientListRow & PatientIdentity;
  cases: ClinicalCase[];
  visitations: RecordEntry[];
  activities: ActivityLogEntry[];
  medications: RecordEntry[];
  reports: ClinicalReport[];
}

export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: readonly T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface LineChartPoint {
  x: IsoDateTime;
  y: number;
}

export interface PieChartSegment {
  label: string;
  value: number;
}

export interface GroupedBar {
  label: string;
  value: number;
}

export interface GroupedBarChartGroup {
  label: string;
  bars: readonly GroupedBar[];
}

export interface ChartData {
  caseTimeline: readonly LineChartPoint[];
  caseDistribution: readonly PieChartSegment[];
  casesByPatient: readonly GroupedBarChartGroup[];
}

export interface AsyncViewState {
  status: AsyncStatus;
  error: string | null;
}

export interface PatientDirectoryViewState extends PageRequest, AsyncViewState {
  query: string;
  gender?: PatientSex;
  childrenOnly?: boolean;
}

export interface CaseQueueViewState extends PageRequest, AsyncViewState {
  statusFilter?: CaseStatus;
  rosterScope: RosterScope;
}
