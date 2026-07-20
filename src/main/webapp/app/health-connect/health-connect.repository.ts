import { Injectable, InjectionToken, Signal, computed, inject, signal } from '@angular/core';

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
} from './health-connect.models';
import {
  HEALTH_CONNECT_DUTY_ROSTERS,
  HEALTH_CONNECT_PATIENT_RECORDS,
  HEALTH_CONNECT_PROFESSIONALS,
  HEALTH_CONNECT_RECOMMENDATIONS,
} from './health-connect.fixtures';

export interface PatientDirectoryFilters {
  gender?: PatientSex;
  childrenOnly?: boolean;
}

export interface HealthConnectRepository {
  readonly patients: Signal<readonly PatientRecord[]>;
  readonly dutyRosters: Signal<readonly DutyRoster[]>;
  readonly asyncState: Signal<AsyncViewState>;
  readonly patientRows: Signal<readonly PatientListRow[]>;
  readonly caseQueue: Signal<readonly CaseQueueRow[]>;
  readonly caseCounts: Signal<Record<CaseStatus, number>>;
  readonly charts: Signal<ChartData>;

  filterPatients(query: string, pageRequest: PageRequest, filters?: PatientDirectoryFilters): Page<PatientListRow>;
  findPatient(id: string): PatientRecord | undefined;
  findCase(id: string): ClinicalCase | undefined;
  listCases(status?: CaseStatus, rosterScope?: RosterScope, professionalId?: string): readonly CaseQueueRow[];
  recommendations(category?: string): readonly Recommendation[];
  professionalIdForAccount(accountLogin: string): string | null;
  shiftLabelForAccount(accountLogin: string): ShiftLabel | null;
  updateCase(
    id: string,
    changes: Partial<Pick<ClinicalCase, 'symptoms' | 'diagnosis' | 'recommendationIds' | 'status'>>,
  ): ClinicalCase | null;
  appendActivity(
    patientId: string,
    entry: Omit<ActivityLogEntry, 'id' | 'occurredAt' | 'label'> & { id?: string; occurredAt?: string; label?: string },
  ): ActivityLogEntry | null;
  appendReport(
    patientId: string,
    report: Omit<ClinicalReport, 'id' | 'occurredAt' | 'label'> & { id?: string; occurredAt?: string; label?: string },
  ): ClinicalReport | null;
  subscribeProfessionalToRoster(professionalId: string, rosterId: string): boolean;
  unsubscribeProfessionalFromRoster(professionalId: string, rosterId: string): boolean;
  archiveCase(id: string): boolean;
  setLoading(loading: boolean): void;
  setError(error: string | null): void;
  reset(): void;
}

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

const copyRosters = (): DutyRoster[] =>
  HEALTH_CONNECT_DUTY_ROSTERS.map(roster => ({
    ...roster,
    subscribedProfessionalIds: [...roster.subscribedProfessionalIds],
    shifts: roster.shifts.map(shift => ({ ...shift })),
  }));

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
export class MockHealthConnectRepository implements HealthConnectRepository {
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
      .sort((left, right) => right.lastActivityAt.localeCompare(left.lastActivityAt)),
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
    this.caseQueue().reduce((counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }), { urgent: 0, open: 0, closed: 0 }),
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
    const subscribedRosterIds = new Set(
      professionalId
        ? this.rosters()
            .filter(roster => roster.subscribedProfessionalIds.includes(professionalId))
            .map(roster => roster.id)
        : [],
    );
    return this.caseQueue().filter(
      item =>
        (!status || item.status === status) &&
        (rosterScope === 'all' || (item.assignedRosterId !== undefined && subscribedRosterIds.has(item.assignedRosterId))),
    );
  }

  recommendations(category?: string): readonly Recommendation[] {
    return HEALTH_CONNECT_RECOMMENDATIONS.filter(recommendation => !category || recommendation.category === category);
  }

  professionalIdForAccount(accountLogin: string): string | null {
    return HEALTH_CONNECT_PROFESSIONALS.find(candidate => candidate.accountLogin === accountLogin)?.id ?? null;
  }

  shiftLabelForAccount(accountLogin: string): ShiftLabel | null {
    const professionalId = this.professionalIdForAccount(accountLogin);
    if (!professionalId) {
      return null;
    }
    const shifts = this.rosters()
      .filter(roster => roster.subscribedProfessionalIds.includes(professionalId))
      .flatMap(roster => roster.shifts)
      .filter(shift => shift.professionalId === professionalId);
    const shift = shifts.find(candidate => candidate.status === 'active') ?? shifts.find(candidate => candidate.status === 'upcoming');
    if (!shift) {
      return null;
    }
    return {
      translationKey: shift.status === 'active' ? 'healthConnect.roster.activeShift' : 'healthConnect.roster.nextShift',
      translationParams: { time: shift.endsAt.slice(11, 16) },
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

  subscribeProfessionalToRoster(professionalId: string, rosterId: string): boolean {
    return this.updateRosterSubscription(professionalId, rosterId, true);
  }

  unsubscribeProfessionalFromRoster(professionalId: string, rosterId: string): boolean {
    return this.updateRosterSubscription(professionalId, rosterId, false);
  }

  archiveCase(id: string): boolean {
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

  private updateRosterSubscription(professionalId: string, rosterId: string, subscribed: boolean): boolean {
    const roster = this.rosters().find(candidate => candidate.id === rosterId);
    if (!roster || roster.subscribedProfessionalIds.includes(professionalId) === subscribed) {
      return false;
    }
    this.rosters.update(rosters =>
      rosters.map(candidate => {
        if (candidate.id !== rosterId) {
          return candidate;
        }
        return {
          ...candidate,
          subscribedProfessionalIds: subscribed
            ? [...candidate.subscribedProfessionalIds, professionalId]
            : candidate.subscribedProfessionalIds.filter(id => id !== professionalId),
        };
      }),
    );
    return true;
  }
}

export const HEALTH_CONNECT_REPOSITORY = new InjectionToken<HealthConnectRepository>('HEALTH_CONNECT_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(MockHealthConnectRepository),
});
