import { Injectable, computed, inject, signal } from '@angular/core';

import { AlertService } from 'app/core/util/alert.service';
import { ClinicalCaseApiService } from './api/clinical-case-api.service';
import { ClinicalCaseDto } from './api/clinical-case-api.model';

import { DutyRosterAssignmentDto, DutyRosterAssignmentsService } from './api/duty-roster-assignments.service';
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
 * (dashboard/patients/clinical-cases/duty-roster). Most of those endpoints do not exist
 * in a running backend yet. It is nonetheless THE active HEALTH_CONNECT_REPOSITORY provider: the
 * in-memory mock it replaced was serving invented patient records to production, and an empty or
 * errored panel is preferable to a fabricated one on a clinical screen.
 *
 * Verified against production on 2026-08-11: clinical-cases returns 200 through the gateway, while
 * patients and the dashboard aggregates return 404 — those panels are empty until the endpoints
 * exist. The shared JWT works, so this is a missing-endpoint problem, not an auth one.
 *
 * The roster read was the exception and is fixed in DR1. It went through `DutyRosterApiService`,
 * whose docstring said "Not wired into the app yet" while this class injected it, and which asked
 * for the whole-estate collection — so every clinician opening the dashboard got a **403**, not a
 * 404, and a red error panel with it. Rosters now come from {@link DutyRosterAssignmentsService},
 * which reads the caller's own assignments and is the client the roster page already used.
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
  private readonly rosterApi = inject(DutyRosterAssignmentsService);
  private readonly clinicalCaseService = inject(ClinicalCaseApiService);
  private readonly alertService = inject(AlertService);

  private readonly patientRowCache = signal<readonly PatientListRow[]>([]);
  private readonly recordCache = signal<ReadonlyMap<string, PatientRecord>>(new Map());
  private readonly pendingRecordFetches = new Set<string>();
  private readonly clinicalCaseCache = signal<readonly ClinicalCaseDto[]>([]);
  private readonly archivedCaseIds = signal<ReadonlySet<string>>(new Set());
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);

  readonly patients = computed<readonly PatientRecord[]>(() => Array.from(this.recordCache().values()));
  /**
   * Derived from {@link DutyRosterAssignmentsService}'s signal rather than cached here, so the
   * dashboard and the sidebar user card cannot disagree about what the caller is on duty for.
   */
  readonly dutyRosters = computed<readonly DutyRoster[]>(() => this.rosterApi.myAssignments().map(toDutyRoster));
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
    // Seeded with every CaseStatus. `treatment` was missing, so cases under treatment were counted
    // nowhere at all — the reduce wrote `undefined + 1` into a key no tile read. Four of twenty
    // cases were invisible to every count on the dashboard.
    this.caseQueue().reduce((counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }), {
      urgent: 0,
      open: 0,
      treatment: 0,
      closed: 0,
    }),
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
    // Client-side filter over the eagerly-fetched patient list cache.
    //
    // The server CAN do this now — `GET /api/patients` takes `query`, `sex`, `childrenOnly`,
    // `page`, `size` and a whitelisted `sort` as of 2026-08-22 — so the old note here ("deferred
    // until a real Patient backend exists") is out of date. What still blocks the move is this
    // interface: `filterPatients` returns a `Page` synchronously from a signal, and every caller
    // reads it in a template. Pushing the filter server-side means making it async and changing
    // those callers, which is Phase 5 of web-mobile-port.md, not a drive-by.
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

  /**
   * "My roster" means *assigned to me*, not *subscribed to by me* — the subscription model is gone
   * (DR1). `dutyRosters` is already the caller's own, so the `professionalId` match is a consistency
   * check rather than the filter doing the work; without an id the scope selects nothing, which is
   * the safe reading of "mine" when we do not know who "me" is.
   */
  listCases(status?: CaseStatus, rosterScope: RosterScope = 'all', professionalId?: string): readonly CaseQueueRow[] {
    const myRosterIds = new Set(
      professionalId
        ? this.dutyRosters()
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
    const updatedCase: ClinicalCaseDto = {
      ...existing,
      symptoms: changes.symptoms ?? existing.symptoms,
      diagnosis: changes.diagnosis ?? existing.diagnosis,
      // recommendations is a real ManyToMany relationship now, so the ids map
      // straight onto related objects — no comma-joined free-text column.
      recommendations: changes.recommendationIds
        ? changes.recommendationIds.map(recommendationId => ({ id: recommendationId }))
        : existing.recommendations,
      status: changes.status ? (changes.status.toUpperCase() as ClinicalCaseDto['status']) : existing.status,
    };
    this.clinicalCaseCache.update(cache => cache.map(candidate => (candidate.id === id ? updatedCase : candidate)));
    this.clinicalCaseService.partialUpdate(updatedCase).subscribe({
      error: () => this.reportWriteFailure('healthConnect.toast.caseSaveFailed'),
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
      error: () => this.reportWriteFailure('healthConnect.toast.activityFailed'),
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
      error: () => this.reportWriteFailure('healthConnect.toast.reportFailed'),
    });
    return optimistic;
  }

  /**
   * Retires a case, on the server.
   *
   * <p>Until 2026-08-23 this only added the id to a local Set, with "No archive endpoint specced"
   * written beside it — true when it was written, and it had stopped being true on 2026-08-22. The
   * effect was that a case one clinician retired was still in every other clinician's queue, and
   * came back for the first clinician on reload.</p>
   *
   * <p>The Set stays, now as an optimistic overlay rather than the whole truth: the row leaves the
   * queue on the click instead of after a round trip, and goes back if the server refuses. Without
   * the rollback a failed archive would look exactly like a successful one until a reload
   * contradicted it — which is the failure mode the old implementation had permanently.</p>
   */
  archiveCase(id: string, reason: string): boolean {
    if (!this.findCase(id) || this.archivedCaseIds().has(id)) {
      return false;
    }
    this.archivedCaseIds.update(ids => new Set(ids).add(id));

    this.clinicalCaseService.archive(id, reason).subscribe({
      error: () => {
        this.archivedCaseIds.update(ids => {
          const next = new Set(ids);
          next.delete(id);
          return next;
        });
        this.reportWriteFailure('healthConnect.toast.archiveFailed');
      },
    });
    return true;
  }

  /**
   * Reports a failed WRITE without blanking what is on screen.
   *
   * <p>Every mutation here used to call `this.error.set(...)`, and `this.error` is what
   * `asyncState.status` reads to decide between the list and "Unable to load this information". So a
   * failed write replaced the whole collection with an error panel — and `Retry` re-ran the load,
   * which succeeded, but never cleared the signal, so only a full page reload brought the list back.
   *
   * <p>Reachable from all four writes; archive is simply the one that fails every time today, since
   * hc-patient gates `/archive` on `ROLE_PROFESSIONAL` and this portal issues no such authority
   * (kojoampia/hc-patient-service#13). Found on the quality stack by clicking it.
   *
   * <p>A load failure legitimately blanks the collection — there is nothing to show. A write failure
   * does not: the data is still there and still correct, and the clinician needs to be told their
   * change did not stick, not to lose the screen.
   */
  private reportWriteFailure(translationKey: string, params?: Record<string, unknown>): void {
    this.alertService.addAlert({ type: 'danger', translationKey, translationParams: params, toast: true, timeout: 5000 });
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

    // `size: 200` is now a REAL ceiling. Until 2026-08-22 `GET /api/patients` accepted no paging
    // parameters and answered with the whole caseload, so this asked for 200 and received however
    // many there were; the server honours it now (web-mobile-port.md § Phase 1.1). Nothing here
    // changes shape — this repository filters and pages client-side over the cache — but a clinician
    // with more than 200 patients would silently see only the 200 most recently active. Moving the
    // filter server-side is Phase 5's job and needs this interface to stop being synchronous first.
    this.patientApi.query({ page: 0, size: 200 }).subscribe({
      next: response => this.patientRowCache.set((response.body ?? []).map(toPatientListRow)),
      error: () => this.error.set('Failed to load patient directory'),
    });

    this.clinicalCaseService.query().subscribe({
      next: response => this.clinicalCaseCache.set(response.body ?? []),
      error: () => this.error.set('Failed to load case queue'),
    });

    // Owns its own load rather than relying on the sidebar having run first — same request count as
    // before, since this class already made one of its own. The service swallows its errors into an
    // empty list, so a roster outage empties the "my roster" scope instead of erroring the page.
    this.rosterApi.loadMyAssignments();

    this.loading.set(false);
  }
}

/**
 * The wire shape and the feature model differ in one place: a DTO that has not been saved yet has no
 * id, and the feature model requires one. Only saved assignments are ever read back here, so the
 * fallback is unreachable in practice — it is there so the types do not have to lie.
 */
const toDutyRoster = (dto: DutyRosterAssignmentDto): DutyRoster => ({
  id: dto.id ?? '',
  date: dto.date,
  duty: dto.duty,
  professionalId: dto.professionalId,
  shift: dto.shift,
  name: dto.name,
  description: dto.description,
});

const toPatientListRow = (dto: PatientListItemDto): PatientListRow => ({
  id: dto.id,
  patientName: dto.patientName,
  lastActivityAt: dto.lastActivityAt,
  sex: dto.sex,
  isChild: dto.isChild,
});

/** The generated enum is upper-case; the feature model's CaseStatus is lower-case. */
const toCaseStatus = (status: ClinicalCaseDto['status']): CaseStatus => (status ? (status.toLowerCase() as CaseStatus) : 'open');

const toCaseQueueRow = (clinicalCase: ClinicalCaseDto): CaseQueueRow => ({
  id: clinicalCase.id,
  patientId: clinicalCase.patientId ?? '',
  date: clinicalCase.openedAt?.toISOString() ?? new Date(0).toISOString(),
  brief: clinicalCase.brief ?? clinicalCase.symptoms ?? '',
  status: toCaseStatus(clinicalCase.status),
  assignedProfessionalId: clinicalCase.assignedProfessionalId ?? undefined,
  assignedRosterId: clinicalCase.assignedRosterId ?? undefined,
});

const toClinicalCase = (clinicalCase: ClinicalCaseDto): ClinicalCase => ({
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
