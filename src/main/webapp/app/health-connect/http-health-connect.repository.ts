import { Injectable, computed, inject, signal } from '@angular/core';

import { ClinicalCaseService } from 'app/entities/patientservice/clinical-case/service/clinical-case.service';
import { IClinicalCase } from 'app/entities/patientservice/clinical-case/clinical-case.model';

import { DutyRosterApiService } from './api/duty-roster-api.service';
import { PatientListItemDto } from './api/patient-api.model';
import { PatientApiService } from './api/patient-api.service';
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
  Recommendation,
  RosterScope,
  ShiftLabel,
} from './health-connect.models';
import { HealthConnectRepository, PatientDirectoryFilters } from './health-connect.repository';

/**
 * Real HttpClient-backed implementation of HealthConnectRepository, built
 * against the REST contracts specced in professional-web.md §5
 * (dashboard/patients/clinical-cases/duty-rosters). None of those endpoints exist
 * in a running backend yet. It is nonetheless THE active HEALTH_CONNECT_REPOSITORY provider: the
 * in-memory mock it replaced was serving invented patient records to production, and an empty or
 * errored panel is preferable to a fabricated one on a clinical screen.
 *
 * Verified against production on 2026-08-11: clinical-cases returns 200 through the gateway, while
 * patients, the dashboard aggregates and duty-rosters return 404 — those panels are empty until the
 * endpoints exist. The shared JWT works, so this is a missing-endpoint problem, not an auth one.
 *
 * Architectural note: the shared HealthConnectRepository interface exposes
 * synchronous signals/methods (mirroring the in-memory mock), but real data
 * has to be fetched asynchronously. This implementation uses a
 * read-through-cache pattern: eagerly-loadable collections (case queue, duty
 * rosters, dashboard charts, the patient list) are fetched once on
 * construction; per-patient full records are fetched lazily the first time
 * `findPatient(id)` is called for an id not yet in the cache, with the
 * result populating a signal so any `computed()` that already called
 * `findPatient` re-evaluates once the response lands (the same reactivity
 * Mock gets from reading a signal internally).
 */
// providedIn: 'root' because HEALTH_CONNECT_REPOSITORY's factory injects this directly. It was a
// bare @Injectable() while it was only ever provided explicitly in specs; leaving it that way now
// throws NullInjectorError the first time any dashboard route is opened.
@Injectable({ providedIn: 'root' })
export class HttpHealthConnectRepository implements HealthConnectRepository {
  private readonly patientApi = inject(PatientApiService);
  private readonly dutyRosterApi = inject(DutyRosterApiService);
  private readonly clinicalCaseService = inject(ClinicalCaseService);

  private readonly patientRowCache = signal<readonly PatientListRow[]>([]);
  private readonly recordCache = signal<ReadonlyMap<string, PatientRecord>>(new Map());
  private readonly pendingRecordFetches = new Set<string>();
  private readonly clinicalCaseCache = signal<readonly IClinicalCase[]>([]);
  private readonly rosterCache = signal<readonly DutyRoster[]>([]);
  private readonly archivedCaseIds = signal<ReadonlySet<string>>(new Set());
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);

  readonly patients = computed<readonly PatientRecord[]>(() => Array.from(this.recordCache().values()));
  readonly dutyRosters = this.rosterCache.asReadonly();
  readonly asyncState = computed<AsyncViewState>(() => ({
    status: this.error() ? 'error' : this.loading() ? 'loading' : 'ready',
    error: this.error(),
  }));
  readonly patientRows = computed(() => this.patientRowCache());
  readonly caseQueue = computed<readonly CaseQueueRow[]>(() =>
    this.clinicalCaseCache()
      .map(toCaseQueueRow)
      .filter(item => !this.archivedCaseIds().has(item.id)),
  );
  readonly caseCounts = computed<Record<CaseStatus, number>>(() =>
    this.caseQueue().reduce((counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }), { urgent: 0, open: 0, closed: 0 }),
  );
  /**
   * Charts derived from the cases already loaded, not fetched.
   *
   * Every one of these is a pure function of the case collection, which this repository holds in a
   * signal. Three round trips to a service that would only re-aggregate the same data bought
   * nothing, and made each chart fail independently when that service was slow. As a `computed`
   * they also update the moment a case changes, which the fetched version did not.
   */
  readonly charts = computed<ChartData>(() => {
    const cases = this.clinicalCaseCache().filter(item => !this.archivedCaseIds().has(item.id ?? ''));

    // Cases opened per month, oldest first. Keyed YYYY-MM so the sort is lexicographic.
    const byMonth = new Map<string, number>();
    for (const item of cases) {
      const openedAt = item.openedAt;
      if (!openedAt) {
        continue;
      }
      const month = openedAt.format('YYYY-MM');
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    }
    const caseTimeline = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ x: month, y: count }));

    // Distribution over status, which is what the pie has always shown.
    const byStatus = new Map<string, number>();
    for (const item of cases) {
      const status = (item.status ?? 'unknown').toLowerCase();
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    }
    const caseDistribution = [...byStatus.entries()].map(([label, value]) => ({ label, value }));

    return {
      caseTimeline,
      caseDistribution,
      // Left empty deliberately. This chart split patients into "new" and "returning", and nothing
      // in the data defines either — the old numbers came from fixtures, and any rule invented here
      // (first case ever? first this month?) would be a clinical claim dressed as a computation.
      // An empty chart is honest; a plausible one is not.
      casesByPatient: [],
    };
  });

  constructor() {
    this.loadAll();
  }

  filterPatients(query: string, pageRequest: PageRequest, filters: PatientDirectoryFilters = {}): Page<PatientListRow> {
    // Client-side filter over the eagerly-fetched patient list cache. A
    // higher-fidelity implementation would push `query`/`filters`/`pageRequest`
    // to PatientApiService.query() server-side; deferred until a real
    // Patient backend exists to validate the round trip against.
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matches = this.patientRowCache().filter(
      row =>
        row.patientName.toLocaleLowerCase().includes(normalizedQuery) &&
        (!filters.gender || row.sex === filters.gender) &&
        (!filters.childrenOnly || row.isChild),
    );
    return paginate(matches, pageRequest);
  }

  findPatient(id: string): PatientRecord | undefined {
    const cached = this.recordCache().get(id);
    if (cached || this.pendingRecordFetches.has(id)) {
      return cached;
    }
    this.pendingRecordFetches.add(id);
    this.patientApi.find(id).subscribe({
      next: dto => {
        const record: PatientRecord = {
          patient: {
            id: dto.id,
            patientName: dto.patientName,
            lastActivityAt: dto.lastActivityAt,
            sex: dto.sex,
            isChild: dto.isChild,
            dateOfBirth: dto.dateOfBirth,
            phone: dto.phone,
            email: dto.email,
            emergencyContact: dto.emergencyContact,
            avatarUrl: dto.avatarUrl,
          },
          cases: dto.cases.map(
            caseSummary =>
              ({
                id: caseSummary.id,
                patientId: dto.id,
                openedAt: caseSummary.openedAt,
                brief: caseSummary.brief,
                status: caseSummary.status,
                symptoms: '',
                diagnosis: '',
                recommendationIds: [],
              }) satisfies ClinicalCase,
          ),
          visitations: dto.visitations,
          activities: dto.activities,
          medications: dto.medications,
          reports: dto.reports,
        };
        this.recordCache.update(cache => new Map(cache).set(id, record));
        this.pendingRecordFetches.delete(id);
      },
      error: () => {
        this.pendingRecordFetches.delete(id);
        this.error.set(`Failed to load patient ${id}`);
      },
    });
    return undefined;
  }

  findCase(id: string): ClinicalCase | undefined {
    const clinicalCase = this.clinicalCaseCache().find(candidate => candidate.id === id);
    return clinicalCase && toClinicalCase(clinicalCase);
  }

  listCases(status?: CaseStatus, rosterScope: RosterScope = 'all', professionalId?: string): readonly CaseQueueRow[] {
    const subscribedRosterIds = new Set(
      professionalId
        ? this.rosterCache()
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
    // No recommendation-catalog endpoint specced (professional-dashboard-migration-plan.md
    // treats it as a static reference list) — reuse the same fixture the mock uses.
    // No endpoint serves the recommendation catalogue — phase_4_contract_reconciliation.md classes
    // it Missing, and §4 Gap 7 notes the values were only ever fixture examples, never a backend
    // enum. This returned those fixtures until they were removed from the application; an empty
    // catalogue is the honest answer until the endpoint exists, and the picker renders empty rather
    // than offering clinical guidance nobody configured.
    void category;
    return [];
  }

  professionalIdForAccount(_accountLogin: string): string | null {
    // No professional-directory endpoint specced in Phase 1 — follow-up.
    return null;
  }

  shiftLabelForAccount(_accountLogin: string): ShiftLabel | null {
    // Depends on professionalIdForAccount above — same follow-up.
    return null;
  }

  updateCase(
    id: string,
    changes: Partial<Pick<ClinicalCase, 'symptoms' | 'diagnosis' | 'recommendationIds' | 'status'>>,
  ): ClinicalCase | null {
    const existing = this.clinicalCaseCache().find(candidate => candidate.id === id);
    if (!existing) {
      return null;
    }
    const updatedCase: IClinicalCase = {
      ...existing,
      symptoms: changes.symptoms ?? existing.symptoms,
      diagnosis: changes.diagnosis ?? existing.diagnosis,
      // recommendations is a real ManyToMany relationship now, so the ids map
      // straight onto related objects — no comma-joined free-text column.
      recommendations: changes.recommendationIds
        ? changes.recommendationIds.map(recommendationId => ({ id: recommendationId }))
        : existing.recommendations,
      status: changes.status ? (changes.status.toUpperCase() as IClinicalCase['status']) : existing.status,
    };
    this.clinicalCaseCache.update(cache => cache.map(candidate => (candidate.id === id ? updatedCase : candidate)));
    this.clinicalCaseService.partialUpdate(updatedCase).subscribe({
      error: () => this.error.set(`Failed to save case ${id}`),
    });
    return toClinicalCase(updatedCase);
  }

  appendActivity(
    patientId: string,
    entry: Omit<ActivityLogEntry, 'id' | 'occurredAt' | 'label'> & { id?: string; occurredAt?: string; label?: string },
  ): ActivityLogEntry | null {
    const record = this.recordCache().get(patientId);
    if (!record) {
      return null;
    }
    const optimistic: ActivityLogEntry = {
      id: entry.id ?? `pending-activity-${Date.now()}`,
      occurredAt: entry.occurredAt ?? entry.createdAt,
      label: entry.label ?? entry.title,
      title: entry.title,
      description: entry.description,
      createdAt: entry.createdAt,
    };
    this.recordCache.update(cache => new Map(cache).set(patientId, { ...record, activities: [...record.activities, optimistic] }));
    this.patientApi.appendActivity(patientId, { title: entry.title, description: entry.description }).subscribe({
      next: saved => {
        const current = this.recordCache().get(patientId);
        if (!current) {
          return;
        }
        this.recordCache.update(cache =>
          new Map(cache).set(patientId, {
            ...current,
            activities: current.activities.map(activity => (activity.id === optimistic.id ? saved : activity)),
          }),
        );
      },
      error: () => this.error.set(`Failed to log activity for patient ${patientId}`),
    });
    return optimistic;
  }

  appendReport(
    patientId: string,
    report: Omit<ClinicalReport, 'id' | 'occurredAt' | 'label'> & { id?: string; occurredAt?: string; label?: string },
  ): ClinicalReport | null {
    const record = this.recordCache().get(patientId);
    if (!record) {
      return null;
    }
    const optimistic: ClinicalReport = {
      id: report.id ?? `pending-report-${Date.now()}`,
      occurredAt: report.occurredAt ?? new Date().toISOString(),
      label: report.label ?? report.reportType,
      reportType: report.reportType,
      url: report.url,
    };
    this.recordCache.update(cache => new Map(cache).set(patientId, { ...record, reports: [...record.reports, optimistic] }));
    this.patientApi.appendReport(patientId, { reportType: report.reportType, url: report.url }).subscribe({
      next: saved => {
        const current = this.recordCache().get(patientId);
        if (!current) {
          return;
        }
        this.recordCache.update(cache =>
          new Map(cache).set(patientId, { ...current, reports: current.reports.map(item => (item.id === optimistic.id ? saved : item)) }),
        );
      },
      error: () => this.error.set(`Failed to save report for patient ${patientId}`),
    });
    return optimistic;
  }

  subscribeProfessionalToRoster(professionalId: string, rosterId: string): boolean {
    return this.updateRosterSubscription(professionalId, rosterId, true);
  }

  unsubscribeProfessionalFromRoster(professionalId: string, rosterId: string): boolean {
    return this.updateRosterSubscription(professionalId, rosterId, false);
  }

  archiveCase(id: string): boolean {
    // No archive endpoint specced — same client-side-only behavior as the mock.
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
    this.recordCache.set(new Map());
    this.pendingRecordFetches.clear();
    this.archivedCaseIds.set(new Set());
    this.error.set(null);
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    this.patientApi.query({ page: 0, size: 200 }).subscribe({
      next: response => this.patientRowCache.set((response.body ?? []).map(toPatientListRow)),
      error: () => this.error.set('Failed to load patient directory'),
    });

    this.clinicalCaseService.query().subscribe({
      next: response => this.clinicalCaseCache.set(response.body ?? []),
      error: () => this.error.set('Failed to load case queue'),
    });

    this.dutyRosterApi.list().subscribe({
      next: rosters => this.rosterCache.set(rosters),
      error: () => this.error.set('Failed to load duty rosters'),
    });

    this.loading.set(false);
  }

  private updateRosterSubscription(professionalId: string, rosterId: string, subscribed: boolean): boolean {
    const roster = this.rosterCache().find(candidate => candidate.id === rosterId);
    if (!roster || roster.subscribedProfessionalIds.includes(professionalId) === subscribed) {
      return false;
    }
    this.rosterCache.update(rosters =>
      rosters.map(candidate =>
        candidate.id === rosterId
          ? {
              ...candidate,
              subscribedProfessionalIds: subscribed
                ? [...candidate.subscribedProfessionalIds, professionalId]
                : candidate.subscribedProfessionalIds.filter(id => id !== professionalId),
            }
          : candidate,
      ),
    );
    const request = subscribed ? this.dutyRosterApi.subscribe(rosterId) : this.dutyRosterApi.unsubscribe(rosterId);
    request.subscribe({ error: () => this.error.set(`Failed to update roster subscription for ${rosterId}`) });
    return true;
  }
}

const toPatientListRow = (dto: PatientListItemDto): PatientListRow => ({
  id: dto.id,
  patientName: dto.patientName,
  lastActivityAt: dto.lastActivityAt,
  sex: dto.sex,
  isChild: dto.isChild,
});

/** The generated enum is upper-case; the feature model's CaseStatus is lower-case. */
const toCaseStatus = (status: IClinicalCase['status']): CaseStatus => (status ? (status.toLowerCase() as CaseStatus) : 'open');

const toCaseQueueRow = (clinicalCase: IClinicalCase): CaseQueueRow => ({
  id: clinicalCase.id,
  patientId: clinicalCase.patientId ?? '',
  date: clinicalCase.openedAt?.toISOString() ?? new Date(0).toISOString(),
  brief: clinicalCase.brief ?? clinicalCase.symptoms ?? '',
  status: toCaseStatus(clinicalCase.status),
  assignedProfessionalId: clinicalCase.assignedProfessionalId ?? undefined,
  assignedRosterId: clinicalCase.assignedRosterId ?? undefined,
});

const toClinicalCase = (clinicalCase: IClinicalCase): ClinicalCase => ({
  id: clinicalCase.id,
  patientId: clinicalCase.patientId ?? '',
  openedAt: clinicalCase.openedAt?.toISOString() ?? new Date(0).toISOString(),
  brief: clinicalCase.brief ?? clinicalCase.symptoms ?? '',
  status: toCaseStatus(clinicalCase.status),
  symptoms: clinicalCase.symptoms ?? '',
  diagnosis: clinicalCase.diagnosis ?? '',
  // Defensive: the relationship may be absent, or a bare id list, depending on
  // whether the backend serialises the related objects.
  recommendationIds: Array.isArray(clinicalCase.recommendations)
    ? clinicalCase.recommendations.map(recommendation => (typeof recommendation === 'string' ? recommendation : recommendation.id))
    : [],
  assignedProfessionalId: clinicalCase.assignedProfessionalId ?? undefined,
  assignedRosterId: clinicalCase.assignedRosterId ?? undefined,
});

const paginate = <T>(items: readonly T[], pageRequest: PageRequest): Page<T> => {
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
