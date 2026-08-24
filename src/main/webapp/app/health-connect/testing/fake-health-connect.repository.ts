import { Injectable, Signal, computed, signal } from '@angular/core';

import {
  ActivityLogEntry,
  AsyncViewState,
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
import { HealthConnectRepository, PatientDirectoryFilters } from '../health-connect.repository';
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
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);

  readonly patients = this.records.asReadonly();
  readonly dutyRosters = this.rosters.asReadonly();
  readonly asyncState = computed<AsyncViewState>(() => ({
    status: this.error() ? 'error' : this.loading() ? 'loading' : 'ready',
    error: this.error(),
  }));
  readonly patientRows = computed(() =>
    this.records()
      .map(toPatientRow)
      // Never-seen patients sort last rather than throwing; an empty string is ordered before any
      // real timestamp, so this reads as "no activity is the oldest activity".
      .sort((left, right) => (right.lastActivityAt ?? '').localeCompare(left.lastActivityAt ?? '')),
  );
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

  findPatient(id: string): PatientRecord | undefined {
    return this.records().find(record => record.patient.id === id);
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
    const next = this.rosters()
      .filter(roster => roster.professionalId === professionalId)
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

  setLoading(loading: boolean): void {
    this.loading.set(loading);
  }

  setError(error: string | null): void {
    this.error.set(error);
  }

  reset(): void {
    this.records.set(copyRecords());
    this.rosters.set(copyRosters());
    this.archivedCaseIds.set(new Set());
    this.loading.set(false);
    this.error.set(null);
  }
}
