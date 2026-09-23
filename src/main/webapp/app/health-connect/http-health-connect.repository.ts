import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { AlertService } from 'app/core/util/alert.service';
import { ClinicalCaseApiService } from './api/clinical-case-api.service';
import { ClinicalCaseDto } from './api/clinical-case-api.model';

import { DutyRosterAssignmentDto, DutyRosterAssignmentsService } from './api/duty-roster-assignments.service';
import { PatientListItemDto } from './api/patient-api.model';
import { PatientApiService } from './api/patient-api.service';
import {
  RestrictedFollowUp,
  RestrictedPart,
  hasUnrecognisedRestrictedParts,
  parseRestrictedFollowUps,
  parseRestrictedParts,
} from './api/restricted-parts';
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
 * What a read reports when it fails.
 *
 * A catalogue key, and the same one `<hpd-async-state>` renders by default — the loads used to set
 * English sentences here ("Failed to load case queue"), which nothing displayed and nothing
 * translated. Still one key for every read, because no surface distinguishes *which* read failed.
 * What item 146 separated is the **state**, and each read now carries its own.
 */
const LOAD_ERROR_KEY = 'healthConnect.states.error';

/**
 * What a read reports when it was refused.
 *
 * <p>A different key as well as a different status, because the sentence is different: "unable to
 * load this information" invites a Retry that cannot help. See {@link classifyFailure}.
 */
const REFUSED_KEY = 'healthConnect.states.forbidden';

/** {@link AsyncViewState} is immutable data, so the three unremarkable ones are shared values. */
const IDLE: AsyncViewState = { status: 'idle', error: null };
const LOADING: AsyncViewState = { status: 'loading', error: null };
const READY: AsyncViewState = { status: 'ready', error: null };

/**
 * A failed response, as the state the read it belongs to should report.
 *
 * <p><b>403 is the boundary and anything else is a failure to read</b> — the same discrimination on
 * the same key that `roster/day-list.component.ts:286` already makes, lifted to a function so every
 * read in this repository makes it rather than one feature making it alone.
 *
 * <p>Typed on `unknown` deliberately: `HttpClient` hands an error callback `any`, and a non-HTTP
 * throw reaches it too. Anything with no readable status is classified as a **failure**, which is
 * the safe direction — calling something a refusal withdraws the Retry that would have fixed it.
 */
const classifyFailure = (response: unknown): AsyncViewState =>
  response instanceof HttpErrorResponse && response.status === 403
    ? { status: 'forbidden', error: REFUSED_KEY }
    : { status: 'error', error: LOAD_ERROR_KEY };

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
  /**
   * What the directory read was refused, parsed from its `X-Restricted-Parts` header.
   *
   * <p>Set from the same response as {@link patientRowCache} and in the same handler, so the rows
   * on screen and the statement about what is missing from them can never come from two different
   * reads. **That is an invariant, not a convenience**, which is why the error path now leaves both
   * alone rather than clearing this one: a failed read replaces neither, so the rows still on screen
   * are still the rows this describes.
   *
   * <p>It said the opposite until item 125 — *"cleared on the error path, because a stale
   * restriction outliving the list it described would explain the wrong list"* — and the premise was
   * false. **The list does not go anywhere**: `patientRowCache` is untouched on error, and untouched
   * by {@link reset} too. So clearing this alone produced the only genuinely inconsistent state — a
   * short list with nothing left saying so. On the dashboard, whose demographic cards sit outside
   * `<hpd-async-state>`, that put four confidently short totals back on screen with no notice: the
   * exact screen item 125 exists to remove, restored by an outage.
   *
   * <p>If the row cache is ever cleared on a failed read, this must be cleared in the same
   * statement. The invariant is that the two move together, not that either has a preferred value.
   */
  private readonly patientRestrictions = signal<readonly RestrictedPart[]>([]);
  /**
   * Whether that same response named a part this bundle does not recognise.
   *
   * <p>Beside {@link patientRestrictions} rather than in it, because it is not a part: nothing can
   * be said *about* it, and it must never reach a screen as a token or a catalogue key. It exists so
   * that a surface rendering a **count** can decline to assert one — `api/` may name a third
   * row-removing part on a release this bundle predates, and dropping that token silently is how
   * four short figures get published under a header that named the reason.
   */
  private readonly patientUnknownRestriction = signal(false);
  /**
   * Which follow-up reads that same response said will refuse, from `X-Restricted-Follow-Ups`.
   *
   * <p>A third signal written in the same statement as the rows, under {@link patientRestrictions}'
   * invariant and for a sharper version of its reason: what this one withdraws is a **link**. Left
   * behind by a failed read it would be stale; cleared by one it would put a hundred live-looking
   * links back over rows that every one of them 503s — the screen item 132 exists to remove,
   * restored by an outage. The three move together or not at all.
   */
  private readonly patientRestrictedFollowUps = signal<readonly RestrictedFollowUp[]>([]);
  private readonly recordCache = signal<ReadonlyMap<string, PatientRecord>>(new Map());
  /**
   * What each cached record's own read was refused, keyed by the same patient id.
   *
   * <p>Keyed rather than a single signal like {@link patientRestrictions}, because records persist
   * in {@link recordCache} and the screen shows whichever one the route names. One value would
   * describe the newest response while an older cached record is on screen, and "you are not
   * permitted to read this patient's activity log" would then be printed against a patient nobody
   * asked about. Written and removed in the same handlers as the record itself.
   */
  private readonly recordRestrictionCache = signal<ReadonlyMap<string, readonly RestrictedPart[]>>(new Map());
  private readonly pendingRecordFetches = new Set<string>();
  private readonly clinicalCaseCache = signal<readonly ClinicalCaseDto[]>([]);
  private readonly archivedCaseIds = signal<ReadonlySet<string>>(new Set());
  /**
   * How the patient-directory read went, and **nothing else's read** (backlog item 146).
   *
   * <p>There was one `error` signal here, written by four handlers belonging to three unrelated
   * reads, and `<hpd-async-state>` blanks everything it wraps on `'error'`. So a refused case queue
   * emptied the directory table, and opening one patient whose record read failed emptied pages the
   * clinician was not even looking at. The reads fail for unrelated reasons; they now say so
   * separately.
   *
   * <p>The failure is carried as a **catalogue key** rather than a sentence. Only `.status` is read
   * today — `<hpd-async-state>` renders its own `errorKey` — but the value is typed as something
   * that may one day be displayed, and an English sentence here would ship untranslated on the day
   * it is.
   *
   * <p>Since item 168 this signal and {@link caseQueueRead} are written **only by the reads
   * themselves** — {@link loadAll} and the two subscribers below, and nothing else in this class or
   * out of it. `setReadState` used to sit on this class with no production caller and let anything
   * holding the repository state a read outcome the network never produced; the seam it existed for
   * is now `FakeHealthConnectRepository`'s alone. Keep it that way: a writer that is not a read is
   * how a signal starts lying.
   *
   * <p>Since item 171 "keep it that way" is a mechanism rather than an instruction — and note that
   * neither keyword on the line below is that mechanism: `private` stops the outside and `readonly`
   * stops reassignment, and neither stops a sibling method in this class calling `.set` directly.
   * `scripts/check-build-output.mjs` parses the shipped bundle and fails CI if a write the bundle
   * spells as `.directoryRead.set(…)` or `.update(…)` — likewise for {@link caseQueueRead} — sits
   * outside {@link loadAll}. That is a lexical guarantee, not a universal one: what the match
   * cannot see is listed in that script's own section, beside the mechanism, so the claim and the
   * check cannot drift apart.
   */
  private readonly directoryRead = signal<AsyncViewState>(IDLE);
  /** How the clinical-case read went. Refused outright for a technician — see {@link REFUSED_KEY}. */
  private readonly caseQueueRead = signal<AsyncViewState>(IDLE);
  /**
   * How each patient's own record read went, keyed by patient id.
   *
   * <p>Keyed for {@link recordRestrictionCache}'s reason and written beside it: records persist in
   * {@link recordCache} and the screen shows whichever one the route names, so one value would
   * describe the newest response while an older record is on screen. These were the two writers
   * that reached furthest — a failed record read set the shared signal, which blanked the directory,
   * the dashboard and the case queue at once.
   */
  private readonly recordReads = signal<ReadonlyMap<string, AsyncViewState>>(new Map());

  readonly patients = computed<readonly PatientRecord[]>(() => Array.from(this.recordCache().values()));
  /**
   * Derived from {@link DutyRosterAssignmentsService}'s signal rather than cached here, so the
   * dashboard and the sidebar user card cannot disagree about what the caller is on duty for.
   */
  readonly dutyRosters = computed<readonly DutyRoster[]>(() => this.rosterApi.myAssignments().map(toDutyRoster));
  readonly directoryState = computed<AsyncViewState>(() => this.directoryRead());
  readonly caseQueueState = computed<AsyncViewState>(() => this.caseQueueRead());
  readonly patientRows = computed(() => this.patientRowCache());
  readonly directoryRestrictions = computed(() => this.patientRestrictions());
  readonly directoryNamedUnknownPart = computed(() => this.patientUnknownRestriction());
  readonly directoryRestrictedFollowUps = computed(() => this.patientRestrictedFollowUps());
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
    this.recordReads.update(states => new Map(states).set(id, LOADING));
    this.patientApi.find(id).subscribe({
      next: response => {
        const dto = response.body;
        if (!dto) {
          // A 200 carrying no body is a broken contract, not a state to render. Substituting an
          // empty record would manufacture precisely the screen item 126 exists to remove: a
          // patient who looks as though nobody has ever touched them.
          //
          // An error against THIS patient, not against the application (item 146). The old line set
          // the shared signal, which blanked the directory, the dashboard and the case queue — three
          // surfaces the clinician was not looking at, none of which had read anything broken.
          this.pendingRecordFetches.delete(id);
          this.recordReads.update(states => new Map(states).set(id, { status: 'error', error: LOAD_ERROR_KEY }));
          return;
        }
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
        // Set from the same response as the record, so what is on screen and what is said to be
        // missing from it can never come from two different reads. Absent header, empty array,
        // silent screen — the ordinary case for five of the eight disciplines.
        this.recordRestrictionCache.update(cache => new Map(cache).set(id, parseRestrictedParts(response.headers)));
        this.pendingRecordFetches.delete(id);
        this.recordReads.update(states => new Map(states).set(id, READY));
      },
      error: (response: unknown) => {
        this.pendingRecordFetches.delete(id);
        // Against this patient alone, and discriminated: `api/` answers 403 for a record outside the
        // caller's scope of practice, and "unable to load" with a Retry is the wrong sentence for a
        // boundary that will refuse every time (item 146).
        this.recordReads.update(states => new Map(states).set(id, classifyFailure(response)));
        // Nothing to drop here, and that is a property worth stating rather than a gap. A fetch
        // only happens for an id that is NOT cached, and the restriction is written in the success
        // handler beside the record — so on this path the map holds no entry for `id`, and the
        // clean-up this once carried was dead code that a passing test appeared to cover. If
        // `findPatient` ever re-reads an already-cached record, that stops being true and a failed
        // refresh would leave a restriction explaining the previous response: clear it here then.
      },
    });
    return undefined;
  }

  recordRestrictions(patientId: string): readonly RestrictedPart[] {
    return this.recordRestrictionCache().get(patientId) ?? [];
  }

  recordState(patientId: string): AsyncViewState {
    // `idle` for a patient never asked for, which is not the same as "ready and empty": the record
    // page renders "no records found" on `ready`, and saying that about a read nobody has made yet
    // is the fabricated-emptiness item 126 removed.
    return this.recordReads().get(patientId) ?? IDLE;
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
   * <p>Every mutation here used to call `this.error.set(...)` — the single shared load-failure signal
   * that item 146 has since split per read, and that `<hpd-async-state>` reads to decide between the
   * list and "Unable to load this information". So a failed write replaced the whole collection with
   * an error panel — and `Retry` re-ran the load, which succeeded, but never cleared the signal, so
   * only a full page reload brought the list back. **A write still reports through an alert and
   * touches no read's state**; splitting the reads did not give a write one to blank.
   *
   * <p>Reachable from all four writes. Archive used to be the one that failed every time, because
   * hc-patient gated `/archive` on `ROLE_PROFESSIONAL` and this portal issues no such authority —
   * found on the quality stack by clicking it, and raised as kojoampia/hc-patient-service#13. That
   * is **fixed** (their PR #14, then #15 which dropped `ROLE_PROFESSIONAL` entirely), so the gate is
   * now `hasAuthority(DOCTOR)`.
   *
   * <p>Two reasons this path still matters for archive rather than becoming dead. It is **not yet in
   * production** — that stack still runs the api image that predates the fix, so an archive from the
   * live dashboard is refused today. And it is doctor-only *by design*: `ROLE_ADMIN` is excluded on
   * purpose, which inverts the usual rule here, so an admin clicking archive gets a 403 that is
   * correct rather than a bug. Both are exactly what this toast exists to say out loud.
   *
   * <p>A load failure legitimately blanks the collection — there is nothing to show. A write failure
   * does not: the data is still there and still correct, and the clinician needs to be told their
   * change did not stick, not to lose the screen.
   */
  private reportWriteFailure(translationKey: string, params?: Record<string, unknown>): void {
    this.alertService.addAlert({ type: 'danger', translationKey, translationParams: params, toast: true, timeout: 5000 });
  }

  reset(): void {
    this.recordCache.set(new Map());
    // With the records. A restriction that survived the cache it described would be re-read against
    // whatever the next fetch returns, which may have been refused nothing.
    this.recordRestrictionCache.set(new Map());
    this.pendingRecordFetches.clear();
    // And with them, how each record read went — for the same reason, one layer up: a `forbidden`
    // left behind by the cleared cache would explain a record that is no longer there.
    this.recordReads.set(new Map());
    this.archivedCaseIds.set(new Set());
    this.loadAll();
  }

  private loadAll(): void {
    // Each read announces its own loading state and clears its own failure. One shared pair of
    // signals here is what let the last read to fail speak for all of them (item 146).
    this.directoryRead.set(LOADING);
    this.caseQueueRead.set(LOADING);

    // `size: 200` is now a REAL ceiling. Until 2026-08-22 `GET /api/patients` accepted no paging
    // parameters and answered with the whole caseload, so this asked for 200 and received however
    // many there were; the server honours it now (web-mobile-port.md § Phase 1.1). Nothing here
    // changes shape — this repository filters and pages client-side over the cache — but a clinician
    // with more than 200 patients would silently see only the 200 most recently active. Moving the
    // filter server-side is Phase 5's job and needs this interface to stop being synchronous first.
    this.patientApi.query({ page: 0, size: 200 }).subscribe({
      next: response => {
        this.patientRowCache.set((response.body ?? []).map(toPatientListRow));
        // The header is absent whenever nothing was withheld, which is the ordinary case; parsing
        // it then yields an empty array and the directory renders exactly as it always did.
        //
        // All four set together, from one response: the rows, what was withheld from them, whether
        // something was withheld that this bundle cannot name, and which read reached from a row
        // will refuse. The last is a second header — `X-Restricted-Follow-Ups`, item 128 — and is
        // absent for a caller who can open what they can see, which is most disciplines.
        this.patientRestrictions.set(parseRestrictedParts(response.headers));
        this.patientUnknownRestriction.set(hasUnrecognisedRestrictedParts(response.headers));
        this.patientRestrictedFollowUps.set(parseRestrictedFollowUps(response.headers));
        this.directoryRead.set(READY);
      },
      // The rows are NOT cleared here, and neither is what was withheld from them (item 125). A
      // failed read replaces nothing, so the cache still holds the previous response's rows and the
      // previous response's restrictions still describe them. Clearing only the second — which this
      // did until item 125 — is what put four confidently short totals back on the dashboard, whose
      // cards are outside the error panel and go on rendering whatever the cache holds.
      error: (response: unknown) => this.directoryRead.set(classifyFailure(response)),
    });

    // The read hc-patient refuses a technician outright, every time: their `ScopeOfPractice` grants
    // {OBSERVATION, IDENTITY}, so this answers 403 on every load for a whole discipline. Its own
    // state, so the refusal empties the case queue and the dashboard charts — which are derived from
    // it — and nothing else.
    this.clinicalCaseService.query().subscribe({
      next: response => {
        this.clinicalCaseCache.set(response.body ?? []);
        this.caseQueueRead.set(READY);
      },
      error: (response: unknown) => this.caseQueueRead.set(classifyFailure(response)),
    });

    // Owns its own load rather than relying on the sidebar having run first — same request count as
    // before, since this class already made one of its own. The service swallows its errors into an
    // empty list, so a roster outage empties the "my roster" scope instead of erroring the page.
    //
    // Untouched by item 146: this read was ALREADY isolated, deliberately and by having no error
    // handler at all, which is what the per-read states above generalise rather than replace.
    this.rosterApi.loadMyAssignments();
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
