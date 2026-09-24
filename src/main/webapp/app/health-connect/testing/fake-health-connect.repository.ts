import { Injectable, Signal, computed, signal } from '@angular/core';

import {
  ActivityLogEntry,
  AsyncViewState,
  asyncState,
  CaseQueueRow,
  CaseStatus,
  ChartData,
  ClinicalCase,
  ClinicalReport,
  DutyRoster,
  Page,
  PageRequest,
  PatientListRow,
  PatientRecord,
  PatientSex,
  Recommendation,
  RosterScope,
  ShiftLabel,
  shiftStartHour,
} from '../health-connect.models';
import { RESTRICTED_FOLLOW_UPS, RESTRICTED_PARTS, RestrictedFollowUp, RestrictedPart } from '../api/restricted-parts';
import { HealthConnectRepository, PatientDirectoryFilters, RepositoryRead } from '../health-connect.repository';
import {
  HEALTH_CONNECT_DUTY_ROSTERS,
  HEALTH_CONNECT_PATIENT_RECORDS,
  HEALTH_CONNECT_PROFESSIONALS,
  HEALTH_CONNECT_RECOMMENDATIONS,
} from './health-connect.fixtures';

/**
 * In-memory {@link HealthConnectRepository} for specs only.
 *
 * <p><strong>Nothing under `app/` may import this.</strong> It was the application's default
 * provider until the fabricated records it serves — Dr. Ama Mensah, seven invented patients with
 * diagnoses — were found rendering in production, where a clinical screen gives no clue that its
 * contents were made up. It lives here so component specs keep a fast, deterministic double without
 * any of that reaching a build: the application is bound to
 * {@link HttpHealthConnectRepository} and shows empty states where an endpoint is still missing.
 *
 * <p>Kept behaviourally identical to what it replaced, so the specs that depend on its filtering,
 * paging and mutation semantics did not have to be rewritten alongside the removal.
 */
const copyRecords = (): PatientRecord[] =>
  HEALTH_CONNECT_PATIENT_RECORDS.map(record => ({
    ...record,
    patient: { ...record.patient, emergencyContact: record.patient.emergencyContact && { ...record.patient.emergencyContact } },
    cases: record.cases.map(clinicalCase => ({ ...clinicalCase, recommendationIds: [...clinicalCase.recommendationIds] })),
    visitations: record.visitations.map(entry => ({ ...entry })),
    activities: record.activities.map(entry => ({ ...entry })),
    medications: record.medications.map(entry => ({ ...entry })),
    reports: record.reports.map(report => ({ ...report })),
  }));

const copyRosters = (): DutyRoster[] => HEALTH_CONNECT_DUTY_ROSTERS.map(roster => ({ ...roster }));

const page = <T>(items: readonly T[], pageRequest: PageRequest): Page<T> => {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageRequest.pageSize));
  const selectedPage = Math.min(Math.max(1, pageRequest.page), totalPages);
  const start = (selectedPage - 1) * pageRequest.pageSize;
  return {
    items: items.slice(start, start + pageRequest.pageSize),
    page: selectedPage,
    pageSize: pageRequest.pageSize,
    totalItems,
    totalPages,
  };
};

const toPatientRow = (record: PatientRecord): PatientListRow => ({
  id: record.patient.id,
  patientName: record.patient.patientName,
  lastActivityAt: record.patient.lastActivityAt,
  sex: record.patient.sex,
  isChild: record.patient.isChild,
});

@Injectable({ providedIn: 'root' })
export class FakeHealthConnectRepository implements HealthConnectRepository {
  private readonly records = signal<readonly PatientRecord[]>(copyRecords());
  private readonly rosters = signal<readonly DutyRoster[]>(copyRosters());
  private readonly archivedCaseIds = signal<ReadonlySet<string>>(new Set());
  /**
   * One state per read, mirroring the real repository (backlog item 146).
   *
   * <p>A single pair of loading/error signals here would let a spec assert an isolation the fake
   * cannot break: every page would go on sharing one state, and "the directory survives a refused
   * case read" would pass by construction. `'ready'` rather than `'idle'` at rest because the fixture
   * data is already present — a fake whose reads have not happened yet would render every page as
   * unread until a spec said otherwise.
   *
   * <p>Built by {@link asyncState} like the real repository's, so every state this fake hands a
   * component is frozen exactly as production's are: a component that edits a state it was handed
   * fails here the way it would fail there, instead of passing green against the one repository
   * whose states forgot to throw (backlog item 180).
   */
  private readonly reads = signal<Readonly<Record<RepositoryRead, AsyncViewState>>>({
    directory: asyncState('ready'),
    caseQueue: asyncState('ready'),
  });
  private readonly recordReads = signal<ReadonlyMap<string, AsyncViewState>>(new Map());
  private readonly restrictions = signal<readonly RestrictedPart[]>([]);
  private readonly unknownRestriction = signal(false);
  private readonly restrictedFollowUps = signal<readonly RestrictedFollowUp[]>([]);
  private readonly recordRestrictionsByPatient = signal<ReadonlyMap<string, readonly RestrictedPart[]>>(new Map());

  readonly patients = this.records.asReadonly();
  readonly dutyRosters = this.rosters.asReadonly();
  readonly directoryState = computed<AsyncViewState>(() => this.reads().directory);
  readonly caseQueueState = computed<AsyncViewState>(() => this.reads().caseQueue);
  /**
   * The directory, with BOTH refusals modelled on the rows rather than only in the header.
   *
   * <p>A fake that sets the header and leaves the body alone describes a response the service
   * cannot send, and every assertion made against that response is vacuous. Both parts had that
   * defect; both are fixed here (backlog item 125, and item 112's fixture argument in `api/`):
   *
   * <ul>
   *   <li><b>`lastActivity` blanks every date.</b> `api/` lists every patient with a null
   *       `lastActivityAt` when it is refused the activity log. Without this, a count derived from
   *       that field computes identically restricted and unrestricted, so a spec asserting "this
   *       refusal changes nothing" passes whatever the code does.
   *   <li><b>`caseAssignments` removes the patients reached through a case.</b> That is what the
   *       refusal costs: the caller never read the case collection, so a patient in the directory
   *       only by way of an assigned case is not in the body.
   * </ul>
   *
   * <p><b>Every fixture record carries an assigned case, so this fixture's directory empties
   * entirely under that refusal.</b> That is a real response shape — `api/` returns early for a
   * caller who reaches nobody, answering `caseAssignments` alone — but it is narrower than the
   * general case, where some patients survive. A fixture with a caseless patient would leave that
   * patient behind, and this rule would then model the short-but-not-empty list a technician
   * actually sees.
   *
   * <p>Only the rows: {@link caseQueue} and {@link caseCounts} are left alone deliberately. The
   * header describes the directory read, not the case read, and a fake that shortened both would
   * make a claim `X-Restricted-Parts` does not.
   */
  readonly patientRows = computed(() => {
    const datesWithheld = this.restrictions().includes('lastActivity');
    const rowsWithheld = this.restrictions().includes('caseAssignments');
    return (
      this.records()
        .filter(record => !rowsWithheld || record.cases.length === 0)
        .map(toPatientRow)
        .map(row => (datesWithheld ? { ...row, lastActivityAt: null } : row))
        // Never-seen patients sort last rather than throwing; an empty string is ordered before any
        // real timestamp, so this reads as "no activity is the oldest activity".
        .sort((left, right) => (right.lastActivityAt ?? '').localeCompare(left.lastActivityAt ?? ''))
    );
  });
  /** Empty unless a spec calls {@link setDirectoryRestrictions} — the ordinary, unrestricted read. */
  readonly directoryRestrictions = this.restrictions.asReadonly();
  /** Set by {@link setDirectoryRestrictions} when a spec names a token the client cannot recognise. */
  readonly directoryNamedUnknownPart = this.unknownRestriction.asReadonly();
  /** Empty unless a spec calls {@link setDirectoryRestrictedFollowUps} — the caller can open what they can see. */
  readonly directoryRestrictedFollowUps = this.restrictedFollowUps.asReadonly();
  readonly caseQueue = computed(() =>
    this.records()
      .flatMap(record =>
        record.cases.map(
          clinicalCase =>
            ({
              id: clinicalCase.id,
              patientId: clinicalCase.patientId,
              date: clinicalCase.openedAt,
              brief: clinicalCase.brief,
              status: clinicalCase.status,
              assignedProfessionalId: clinicalCase.assignedProfessionalId,
              assignedRosterId: clinicalCase.assignedRosterId,
            }) satisfies CaseQueueRow,
        ),
      )
      .filter(item => !this.archivedCaseIds().has(item.id))
      .sort((left, right) => right.date.localeCompare(left.date)),
  );
  readonly caseCounts = computed<Record<CaseStatus, number>>(() =>
    // Every CaseStatus, same as the real repository. A short seed silently drops the statuses it
    // omits — they are counted into a key nothing reads.
    this.caseQueue().reduce((counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }), {
      urgent: 0,
      open: 0,
      treatment: 0,
      closed: 0,
    }),
  );
  readonly charts = computed<ChartData>(() => {
    const counts = this.caseCounts();
    return {
      caseTimeline: this.caseQueue().map((item, index) => ({ x: item.date, y: index + 1 })),
      caseDistribution: [
        { label: 'urgent', value: counts.urgent },
        { label: 'open', value: counts.open },
        { label: 'closed', value: counts.closed },
      ],
      casesByPatient: this.records().map(record => ({
        label: record.patient.patientName,
        bars: [{ label: 'cases', value: record.cases.length }],
      })),
    };
  });

  filterPatients(query: string, pageRequest: PageRequest, filters: PatientDirectoryFilters = {}): Page<PatientListRow> {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matches = this.patientRows().filter(
      row =>
        row.patientName.toLocaleLowerCase().includes(normalizedQuery) &&
        (!filters.gender || row.sex === filters.gender) &&
        (!filters.childrenOnly || row.isChild),
    );
    return page(matches, pageRequest);
  }

  /**
   * The record — unless the directory read said this follow-up will refuse, in which case there is
   * no record to be had.
   *
   * <p>Modelled rather than left alone, for the reason {@link patientRows} models both parts of
   * `X-Restricted-Parts`: a fake that carries a header while behaving as though nothing were
   * restricted describes a response the service cannot send, and every assertion against it is
   * vacuous. Here the header names a *different* endpoint, so the directory body is genuinely
   * unchanged and the fidelity owed is on this method — `api/` answers 503, the record never lands,
   * and the real repository's `findPatient` returns `undefined` exactly as this does.
   */
  findPatient(id: string): PatientRecord | undefined {
    if (this.restrictedFollowUps().includes('record')) {
      return undefined;
    }
    return this.records().find(record => record.patient.id === id);
  }

  recordRestrictions(patientId: string): readonly RestrictedPart[] {
    return this.recordRestrictionsByPatient().get(patientId) ?? [];
  }

  /**
   * How one patient's record read went. `ready` for a record the fixture holds, so a spec that says
   * nothing about a read gets the unremarkable case rather than a page claiming nothing was read.
   */
  recordState(patientId: string): AsyncViewState {
    return this.recordReads().get(patientId) ?? asyncState('ready');
  }

  findCase(id: string): ClinicalCase | undefined {
    return this.records()
      .flatMap(record => record.cases)
      .find(clinicalCase => clinicalCase.id === id);
  }

  listCases(status?: CaseStatus, rosterScope: RosterScope = 'all', professionalId?: string): readonly CaseQueueRow[] {
    const myRosterIds = new Set(
      professionalId
        ? this.rosters()
            .filter(roster => roster.professionalId === professionalId)
            .map(roster => roster.id)
        : [],
    );
    return this.caseQueue().filter(
      item =>
        (!status || item.status === status) &&
        (rosterScope === 'all' || (item.assignedRosterId !== undefined && myRosterIds.has(item.assignedRosterId))),
    );
  }

  recommendations(category?: string): readonly Recommendation[] {
    return HEALTH_CONNECT_RECOMMENDATIONS.filter(recommendation => !category || recommendation.category === category);
  }

  professionalIdForAccount(accountLogin: string): string | null {
    return HEALTH_CONNECT_PROFESSIONALS.find(candidate => candidate.accountLogin === accountLogin)?.id ?? null;
  }

  /**
   * The caller's earliest assignment, reported as their next shift.
   *
   * <p>It does **not** consult the clock, and that is the point: the old version keyed off a
   * `status: 'active' | 'upcoming'` field baked into the fixtures, which the assignment model has no
   * equivalent of. Deriving "active" here instead would make every spec that touches this pass or
   * fail by the hour it ran at — the same trap `duty-roster-assignments.service.spec` has to hold off
   * with `advanceTo`. Real active/next resolution lives in
   * {@link DutyRosterAssignmentsService.computeShiftLabel} and is tested there against a pinned clock.
   */
  shiftLabelForAccount(accountLogin: string): ShiftLabel | null {
    const professionalId = this.professionalIdForAccount(accountLogin);
    if (!professionalId) {
      return null;
    }
    // filter() already returns a fresh array, so sorting it in place does not touch the signal.
    // OFF is dropped for the same reason the real implementation drops it: a rest day is not a
    // next shift, and `shiftStartHour` would otherwise sort it in at 07:00 like any windowless value.
    const next = this.rosters()
      .filter(roster => roster.professionalId === professionalId && roster.shift !== 'OFF')
      .sort((left, right) =>
        left.date === right.date ? shiftStartHour(left.shift) - shiftStartHour(right.shift) : left.date < right.date ? -1 : 1,
      )[0];
    if (!next) {
      return null;
    }
    if (next.shift === 'FLEXIBLE') {
      return { translationKey: 'healthConnect.roster.nextFlexibleShift', translationParams: { date: next.date } };
    }
    return {
      translationKey: 'healthConnect.roster.nextShift',
      translationParams: { time: `${next.date} ${String(shiftStartHour(next.shift)).padStart(2, '0')}:00` },
    };
  }

  updateCase(
    id: string,
    changes: Partial<Pick<ClinicalCase, 'symptoms' | 'diagnosis' | 'recommendationIds' | 'status'>>,
  ): ClinicalCase | null {
    let updatedCase: ClinicalCase | null = null;
    this.records.update(records =>
      records.map(record => ({
        ...record,
        cases: record.cases.map(clinicalCase => {
          if (clinicalCase.id !== id) {
            return clinicalCase;
          }
          const updated = { ...clinicalCase, ...changes, recommendationIds: changes.recommendationIds ?? clinicalCase.recommendationIds };
          updatedCase = updated;
          return updated;
        }),
      })),
    );
    return updatedCase;
  }

  appendActivity(
    patientId: string,
    entry: Omit<ActivityLogEntry, 'id' | 'occurredAt' | 'label'> & { id?: string; occurredAt?: string; label?: string },
  ): ActivityLogEntry | null {
    let activity: ActivityLogEntry | null = null;
    this.records.update(records =>
      records.map(record => {
        if (record.patient.id !== patientId) {
          return record;
        }
        const newActivity: ActivityLogEntry = {
          id: entry.id ?? `activity-${record.activities.length + 1}`,
          occurredAt: entry.occurredAt ?? entry.createdAt,
          label: entry.label ?? entry.title,
          title: entry.title,
          description: entry.description,
          createdAt: entry.createdAt,
        };
        activity = newActivity;
        return { ...record, activities: [...record.activities, newActivity] };
      }),
    );
    return activity;
  }

  appendReport(
    patientId: string,
    report: Omit<ClinicalReport, 'id' | 'occurredAt' | 'label'> & { id?: string; occurredAt?: string; label?: string },
  ): ClinicalReport | null {
    let clinicalReport: ClinicalReport | null = null;
    this.records.update(records =>
      records.map(record => {
        if (record.patient.id !== patientId) {
          return record;
        }
        const newReport: ClinicalReport = {
          id: report.id ?? `report-${record.reports.length + 1}`,
          occurredAt: report.occurredAt ?? '2026-07-20T15:00:00Z',
          label: report.label ?? report.reportType,
          reportType: report.reportType,
          url: report.url,
        };
        clinicalReport = newReport;
        return { ...record, reports: [...record.reports, newReport] };
      }),
    );
    return clinicalReport;
  }

  archiveCase(id: string, _reason: string): boolean {
    if (!this.findCase(id) || this.archivedCaseIds().has(id)) {
      return false;
    }
    this.archivedCaseIds.update(ids => new Set(ids).add(id));
    return true;
  }

  /**
   * Put one collection read into a chosen state.
   *
   * <p>Spec-only and, since backlog item 168, **deliberately not on {@link HealthConnectRepository}**
   * — like {@link setRecordState} and the restriction setters beside it, and for the same reason. It
   * was on the interface and on `HttpHealthConnectRepository` with no production caller, which made a
   * read outcome settable by anything holding the repository: a state no read produced, asserting
   * something the network never said. That is the shape items 146 and 165 exist to remove. The real
   * repository derives these two states from a response and from nothing else.
   *
   * <p>It stays *here* because the cases those items turn on — a refused read, an outage, a read that
   * never answered — are reached through this seam wherever a spec needs one. Deliberately no list of
   * which specs: the first version of this sentence carried one and it was already wrong — "three page
   * specs and this file's own" missed `async-state.component.spec.ts` — and a hand-kept enumeration in
   * a comment is the next wrong count. Grep for the callers instead. Removing the seam without this
   * replacement would have made those cases unreachable and cost both rows their guards.
   *
   * <p>One method rather than one per state because the states are a closed set: `'forbidden'` would
   * otherwise have needed a third setter on the day item 146 added it, which is how a fourth arrives
   * without one. `health-connect.repository.spec.ts` enumerates `ASYNC_STATUSES` through this method
   * so a member added later is covered without anyone editing the check.
   *
   * <p>The state is rebuilt through {@link asyncState} rather than stored as handed in, so what this
   * fake emits is frozen exactly as production's states are — a spec driving a component into an
   * `error` state must not hand it the one mutable state object in the estate (backlog item 180).
   * The copy does not freeze the caller's object, and it means a spec cannot steer the fake by
   * mutating a reference it kept — the seam is this method, not aliasing.
   */
  setReadState(read: RepositoryRead, state: AsyncViewState): void {
    this.reads.update(reads => ({ ...reads, [read]: asyncState(state.status, state.error) }));
  }

  /**
   * Stand in for one patient's record read failing or being refused.
   *
   * <p>Spec-only and deliberately not on {@link HealthConnectRepository}, like the restriction
   * setters beside it: the real repository derives this from a response. It exists so a spec can
   * prove the containment item 146 is mostly about — a record read that goes wrong must leave the
   * directory, the dashboard and the case queue exactly as they were.
   */
  setRecordState(patientId: string, state: AsyncViewState): void {
    // Rebuilt through the builder for setReadState's reason: frozen out of the fake, untouched in
    // the caller's hands.
    this.recordReads.update(states => new Map(states).set(patientId, asyncState(state.status, state.error)));
  }

  /**
   * Stand in for an `X-Restricted-Parts` header on the directory read.
   *
   * <p>Spec-only, and deliberately not on {@link HealthConnectRepository}: the real repository
   * derives this from a response and nothing in the application may set it. Cleared by
   * {@link reset}, so a spec that restricts a part cannot leak it into the next one.
   *
   * <p><b>It takes what the header named, not what the client understood</b>, and splits the two
   * exactly as the parser does — known tokens are stored, anything else raises
   * {@link directoryNamedUnknownPart} and is otherwise discarded. So a spec passing a token
   * `api/` might name on a later release (`'medications' as RestrictedPart`) reproduces the real
   * pairing, rather than having to know which of two signals to set.
   */
  setDirectoryRestrictions(restrictions: readonly RestrictedPart[]): void {
    const known: readonly string[] = RESTRICTED_PARTS;
    this.restrictions.set(restrictions.filter(part => known.includes(part)));
    this.unknownRestriction.set(restrictions.some(part => !known.includes(part)));
  }

  /**
   * Stand in for an `X-Restricted-Follow-Ups` header on the directory read.
   *
   * <p>Separate from {@link setDirectoryRestrictions} because the two headers are separate on the
   * wire and say different things — a spec that could only set them together could not reproduce the
   * pharmacist, who is refused a part and opens records anyway. Known/unknown is split exactly as the
   * parser splits it, so a spec passing a follow-up `api/` might name on a later release
   * (`'cases' as RestrictedFollowUp`) reproduces the real drop rather than inventing one.
   */
  setDirectoryRestrictedFollowUps(followUps: readonly RestrictedFollowUp[]): void {
    const known: readonly string[] = RESTRICTED_FOLLOW_UPS;
    this.restrictedFollowUps.set(followUps.filter(followUp => known.includes(followUp)));
  }

  /**
   * Stand in for an `X-Restricted-Parts` header on one patient's record read.
   *
   * <p>Per patient for the reason the real repository keys its cache that way: a record on screen
   * and the statement about what was withheld from it must name the same patient. Spec-only and
   * cleared by {@link reset}, like {@link setDirectoryRestrictions}.
   */
  setRecordRestrictions(patientId: string, restrictions: readonly RestrictedPart[]): void {
    this.recordRestrictionsByPatient.update(cache => new Map(cache).set(patientId, restrictions));
  }

  reset(): void {
    this.records.set(copyRecords());
    this.rosters.set(copyRosters());
    this.archivedCaseIds.set(new Set());
    this.reads.set({ directory: asyncState('ready'), caseQueue: asyncState('ready') });
    this.recordReads.set(new Map());
    this.restrictions.set([]);
    this.unknownRestriction.set(false);
    this.restrictedFollowUps.set([]);
    this.recordRestrictionsByPatient.set(new Map());
  }
}
