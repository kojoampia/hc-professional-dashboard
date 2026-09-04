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

/**
 * The four values patientservice's `CaseStatus` enum can hold, lower-cased.
 *
 * <p>`treatment` was missing until 2026-08-23 and the omission was invisible in both directions:
 * TypeScript cannot check a string that arrives over HTTP, and the status column renders whatever
 * it is handed. The symptom on a deployed queue was
 * `translation-not-found[healthConnect.stats.treatment]` printed in the status cell of every case
 * under treatment — four of twenty — in all four languages at once, so a key-parity check between
 * the locales would not have found it either. They were equally wrong.
 *
 * <p>**This union must match the sibling's enum, not the subset this app happens to have seen.**
 * `case-status.spec.ts` pins it and checks every value has a translation key.
 */
export type CaseStatus = 'urgent' | 'open' | 'treatment' | 'closed';

/**
 * The row tint for a case status.
 *
 * <p>`treatment` borrows the open tint rather than getting one of its own: a case under treatment is
 * an active case, and there is no `--hpd-color-row-treatment` token. Adding a brand colour is a
 * design decision with an AA contrast check attached, and not a type fix's to make.
 *
 * <p>One function rather than a ternary at each binding — there are three, and the third was found
 * only by `ng build`, because template type-checking does not run under `tsc --noEmit`.
 */
export const caseStatusVariant = (status: CaseStatus | undefined): 'urgent' | 'open' | 'closed' | 'neutral' => {
  if (status === undefined) {
    return 'neutral';
  }
  return status === 'treatment' ? 'open' : status;
};
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
 *
 * <p><b>`OFF` was added in the superset change (2026-09-04)</b> and is a rostered rest day: planned,
 * and deliberately not worked. It is hc-admin's value, and the two enums are now the same five values
 * in the same order on both sides of the estate rather than four-that-nearly-match. The alternative
 * was a translation table at a boundary where three of the four names already agreed, and
 * near-identity is more dangerous than clean difference. See `adminservice-earnings-contract.md`.
 *
 * <p>`OFF` has **no window**, like `FLEXIBLE`, and unlike `FLEXIBLE` it carries no visits at all —
 * the server rejects a round that is `OFF` and has any. It is the one value here for which "when does
 * this shift run" has no answer rather than the answer "all day".
 */
export const DUTY_ROSTER_SHIFTS = ['DAY', 'EVENING', 'NIGHT', 'OFF', 'FLEXIBLE'] as const;

/**
 * The union, **derived from the runtime list above rather than written twice.**
 *
 * <p>A TypeScript union cannot be enumerated at runtime, so a test cannot ask "does every shift have
 * a translation" of a bare `'DAY' | 'EVENING' | …`. That is why the values are a `const` array and the
 * type comes from it: `shift-names.spec.ts` derives the catalogue keys it expects from
 * {@link DUTY_ROSTER_SHIFTS}, so adding a value here fails that test in all four locales until the
 * catalogues carry it — instead of rendering `healthConnect.shiftType.OFF` to a French user with
 * nothing thrown. The ordering is the display order the calendar, the week grid's rows and the assign
 * form all use (see `duty-roster.md` § 9: the two windowless values last, `FLEXIBLE` after `OFF`).
 *
 * <p>This is also the **only** shift union in this app. `earnings-api.model.ts` used to declare an
 * `AdminShiftType` beside it to record that hc-admin's enum differed; it re-exports this one now,
 * because it does not.
 */
export type DutyRosterShift = (typeof DUTY_ROSTER_SHIFTS)[number];

/**
 * The windows above as hours of the day, kept beside the union so the two cannot drift apart.
 *
 * <p>NIGHT is the one that reads oddly — `start` 23 is greater than `end` 7 because it wraps, and an
 * 01:00 moment belongs to the *previous* date's shift. Anything consuming this table has to say so
 * explicitly; the wrap is the single easiest thing here to get subtly wrong.
 *
 * <p>FLEXIBLE and OFF are deliberately absent rather than mapped to 0–24 and 0–0. FLEXIBLE covers its
 * whole date and OFF is not worked at all, so "is the hour inside the window" is the wrong question
 * for both and a `Partial` record forces the caller to answer the right one. Two absent values rather
 * than one is worth noticing when reading a caller: a `?? default` that was written for FLEXIBLE now
 * also answers for OFF, and only some of those defaults still make sense.
 */
export const SHIFT_WINDOWS: Partial<Record<DutyRosterShift, { start: number; end: number }>> = {
  DAY: { start: 7, end: 15 },
  EVENING: { start: 15, end: 23 },
  NIGHT: { start: 23, end: 7 },
};

/** Sorting anchor for the windowless values, which have no meaningful start. */
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
