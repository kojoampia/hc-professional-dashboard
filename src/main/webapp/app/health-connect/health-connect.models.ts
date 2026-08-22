export type IsoDateTime = string;

export enum AuthorityRole {
  ADMIN = 'Admin',
  DOCTOR = 'Doctor',
  NURSE = 'Nurse',
  PARAMEDIC = 'Paramedic',
  PHARMACIST = 'Pharmacist',
  THERAPIST = 'Therapist',
  CARER = 'Carer',
  ANGEL = 'Angel',
  CHEMIST = 'Chemist',
  TECHNICIAN = 'Technician',
  USER = 'User',
}

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

/**
 * Mirrors `api/domain/enumeration/ShiftType`, and moves with it — one of the four places the
 * workspace guide names as a cross-repo invariant. Windows (local time, contiguous across the day):
 * DAY 07–15, EVENING 15–23, NIGHT 23–07 wrapping past midnight, FLEXIBLE the whole day for
 * individually agreed 2–4 hour blocks. MORNING and AFTERNOON were retired in DR1.
 */
export type DutyRosterShift = 'DAY' | 'EVENING' | 'NIGHT' | 'FLEXIBLE';

/**
 * The windows above as hours of the day, kept beside the union so the two cannot drift apart.
 *
 * <p>NIGHT is the one that reads oddly — `start` 23 is greater than `end` 7 because it wraps, and an
 * 01:00 moment belongs to the *previous* date's shift. Anything consuming this table has to say so
 * explicitly; the wrap is the single easiest thing here to get subtly wrong.
 *
 * <p>FLEXIBLE is deliberately absent rather than mapped to 0–24. It covers its whole date, so asking
 * "is the hour inside the window" is the wrong question for it and a `Partial` record forces the
 * caller to answer the right one.
 */
export const SHIFT_WINDOWS: Partial<Record<DutyRosterShift, { start: number; end: number }>> = {
  DAY: { start: 7, end: 15 },
  EVENING: { start: 15, end: 23 },
  NIGHT: { start: 23, end: 7 },
};

/** Sorting anchor for FLEXIBLE, which spans the day and so has no meaningful start. */
const DEFAULT_START_HOUR = 7;

export const shiftStartHour = (shift: DutyRosterShift): number => SHIFT_WINDOWS[shift]?.start ?? DEFAULT_START_HOUR;

/**
 * One duty-roster assignment: this professional, this date, this shift.
 *
 * <p>This replaced a `DutyRoster { name, subscribedProfessionalIds, shifts: DutyShift[] }` that
 * described a subscription model the backend never had — professionals were never able to subscribe
 * to a roster, and the endpoints the old shape implied (`/{id}/subscription`) do not exist. The
 * roster is assignment-only: administrators assign, professionals read. See docs/duty-roster.md § 1.
 */
export interface DutyRoster {
  id: string;
  /** ISO date, no time — the shift supplies the window. */
  date: string;
  duty: string;
  professionalId: string;
  shift: DutyRosterShift;
  name: string;
  description?: string | null;
}

export interface ShiftLabel {
  translationKey:
    | 'healthConnect.roster.activeShift'
    | 'healthConnect.roster.nextShift'
    | 'healthConnect.roster.flexibleShift'
    | 'healthConnect.roster.nextFlexibleShift';
  translationParams: { time?: string; date?: string };
}

export interface PatientListRow {
  id: string;
  patientName: string;
  /**
   * When this patient was last seen, or null if they never have been.
   *
   * <p>Nullable, and it always was on the wire — `PatientDirectoryService` derives it from the
   * patient's activity log and a patient with no entries has none. This was typed non-null, so
   * TypeScript raised nothing at the one place that dereferenced it, and every fixture supplied a
   * value, so the tests agreed with the wrong type rather than checking it. The symptom was a
   * directory that rendered two rows out of nineteen, with a null-dereference in the console per
   * missing row.
   */
  lastActivityAt: IsoDateTime | null;
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
