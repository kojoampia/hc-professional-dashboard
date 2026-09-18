import { InjectionToken, Signal, inject } from '@angular/core';

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
import { RestrictedFollowUp, RestrictedPart } from './api/restricted-parts';
import { HttpHealthConnectRepository } from './http-health-connect.repository';

export interface PatientDirectoryFilters {
  gender?: PatientSex;
  childrenOnly?: boolean;
}

/**
 * The collection reads this repository makes eagerly, as the names their states are addressed by.
 *
 * <p>The per-patient record read is **not** one of them: it takes an id, so its state is a method —
 * {@link HealthConnectRepository.recordState} — exactly as
 * {@link HealthConnectRepository.recordRestrictions} is, and for the same reason.
 *
 * <p>The roster read is not one either, deliberately: `DutyRosterAssignmentsService` swallows its own
 * failure into an empty list, so a roster outage empties the "my roster" scope instead of erroring a
 * page. Item 146 generalised that isolation to the other two reads; it did not replace it.
 *
 * <p>Since item 168 its only consumer is `FakeHealthConnectRepository` — the seam that names a read
 * is spec-only now. It stays declared here regardless: which reads this repository makes is a fact
 * about the repository, not about the double, and `directoryState` / `caseQueueState` below are the
 * two members it names.
 */
export type RepositoryRead = 'directory' | 'caseQueue';

export interface HealthConnectRepository {
  readonly patients: Signal<readonly PatientRecord[]>;
  /**
   * The caller's own duty assignments — not the estate's.
   *
   * <p>`subscribeProfessionalToRoster` / `unsubscribeProfessionalFromRoster` sat here until DR1 and
   * are gone: the roster is assignment-only, administrators assign and professionals read, and the
   * `/{id}/subscription` endpoints they called were never built on either side.
   */
  readonly dutyRosters: Signal<readonly DutyRoster[]>;
  /**
   * How the patient-directory read went — and **nothing else's read** (backlog item 146).
   *
   * <p>There was one `asyncState` here for every read this repository makes, and `<hpd-async-state>`
   * blanks everything it wraps when it is `error`. hc-patient refuses a technician the case read on
   * every load, so a directory that had answered `200` with rows, columns and its restriction notice
   * was replaced by "Unable to load this information" and a Retry that re-issues the same 403 for
   * ever. One status per read is half the fix; `'forbidden'` being a status of its own is the other
   * half. See `AsyncStatus`.
   */
  readonly directoryState: Signal<AsyncViewState>;
  /** How the clinical-case read went. What the dashboard's charts are derived from, so what they report. */
  readonly caseQueueState: Signal<AsyncViewState>;
  readonly patientRows: Signal<readonly PatientListRow[]>;
  /**
   * What the last patient-directory read was refused, from its `X-Restricted-Parts` header.
   *
   * <p>Empty for a caller refused nothing, which is five of the eight disciplines and the case
   * nothing should pay for. **A fact about the read, not about any row** — `caseAssignments` says
   * rows are missing, which no per-row field could ever say — so it sits beside `patientRows`
   * rather than inside `PatientListRow`. See `api/restricted-parts.ts` for why it must be
   * re-derived per read and never cached as a capability.
   */
  readonly directoryRestrictions: Signal<readonly RestrictedPart[]>;
  /**
   * Whether that same read named a part this bundle does not recognise.
   *
   * <p>Separate from {@link directoryRestrictions}, which carries only the parts that can be
   * *reasoned about*; this carries the fact that something could not be. A surface rendering rows
   * goes on rendering the rows it has, and a surface rendering a **count** declines to state one.
   *
   * <p>The asymmetry is the whole of it: dropping an unknown token is right for deciding what to
   * print and wrong for deciding whether a total may be asserted — and `api/` naming a third
   * row-removing part on a release this bundle predates is the structural case, not a remote one,
   * since the repos ship as independently tagged images. See `hasUnrecognisedRestrictedParts` in
   * `api/restricted-parts.ts`.
   */
  readonly directoryNamedUnknownPart: Signal<boolean>;
  /**
   * Which reads reached *from* that directory the caller will be refused, from its
   * `X-Restricted-Follow-Ups` header.
   *
   * <p>**Not a restatement of {@link directoryRestrictions}, and not derivable from it.** That one
   * says what this read lost; this one says what a *different* read will refuse. A pharmacist is
   * refused `lastActivity` and opens records perfectly well, so a client inferring one from the
   * other would withdraw a link that works. `api/` derives it there, from its own record path, which
   * is the only place the fact is known — see item 128.
   *
   * <p>Empty for a caller who can open what they can see, which is most disciplines. Beside
   * `patientRows` rather than inside `PatientListRow` for {@link directoryRestrictions}' reason: it
   * is a fact about the read, and it is the same fact for every row in it.
   */
  readonly directoryRestrictedFollowUps: Signal<readonly RestrictedFollowUp[]>;
  readonly caseQueue: Signal<readonly CaseQueueRow[]>;
  readonly caseCounts: Signal<Record<CaseStatus, number>>;
  readonly charts: Signal<ChartData>;

  filterPatients(query: string, pageRequest: PageRequest, filters?: PatientDirectoryFilters): Page<PatientListRow>;
  findPatient(id: string): PatientRecord | undefined;
  /**
   * What the read behind {@link findPatient}'s record was refused, from its `X-Restricted-Parts`
   * header.
   *
   * <p>**Per patient, not one signal for the last read**, because records are cached and a
   * clinician moves between them: a single value would describe the most recent response while an
   * earlier cached record is the one on screen, and the sentence would then be attached to the
   * wrong patient. Empty for an unrestricted read and for a patient never fetched.
   *
   * <p>A method rather than a `Signal` for {@link findPatient}'s reason — it takes an id — and it
   * reads a signal internally, so a `computed()` calling it re-evaluates when the response lands.
   *
   * <p>See `backlog.md` items 112 and 126, and `api/restricted-parts.ts` for why the record's one
   * reachable token needs its own sentence rather than the directory's.
   */
  recordRestrictions(patientId: string): readonly RestrictedPart[];
  /**
   * How one patient's record read went, by the same id {@link findPatient} takes.
   *
   * <p>Per patient for {@link recordRestrictions}' reason — records are cached and a clinician moves
   * between them — and a method rather than a signal for {@link findPatient}'s. `idle` for a patient
   * never asked for, which is **not** "ready with nothing in it": the record page says "no records
   * found" on a ready read, and saying that about a read nobody has made is fabricated emptiness.
   *
   * <p>This read's two failure handlers were the shared signal's worst writers (item 146): opening
   * one patient whose record 503'd blanked the directory, the dashboard and the case queue — three
   * surfaces the clinician was not even looking at.
   */
  recordState(patientId: string): AsyncViewState;
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
  /** Retires a case from the queue. The reason is required by the server and is not defaulted. */
  archiveCase(id: string, reason: string): boolean;
  /*
   * There is deliberately no `setReadState` on this interface — backlog item 168. This note is here
   * so its absence reads as a decision rather than an omission somebody should tidy up.
   *
   * It sat here, and on `HttpHealthConnectRepository`, with **no production caller**: every use was a
   * spec putting a read into a state the real reads would otherwise have to be provoked into. That is
   * legitimate for a spec and wrong for this surface. A mutator declared here is reachable from
   * production code, and the day something calls it the repository has a second way to set a state
   * that no read produced — a signal asserting something the network never said. That is the shape
   * items 146 and 165 exist to remove, one layer down.
   *
   * The seam was not deleted, it moved: `FakeHealthConnectRepository.setReadState` keeps it, beside
   * `setRecordState`, which was already spec-only for exactly this reason. Deleting it outright would
   * have made the refused-read, outage and unanswered-read cases those two items turn on unreachable,
   * and quietly cost both rows their guards.
   *
   * `health-connect.repository.spec.ts` holds both halves: that every `AsyncStatus` is still reachable
   * from a spec — enumerated from `ASYNC_STATUSES`, so a sixth member is covered without anyone
   * editing the check — and that the name is back on neither this interface nor the HTTP
   * implementation.
   *
   * `reset()` is **not** the same shape and stays: it has five production callers, every one a
   * `(retry)` handler on a page template.
   */
  reset(): void;
}

/**
 * The dashboard's data source. Bound to {@link HttpHealthConnectRepository}: every read goes to the
 * gateway, which routes to `professionalservice` or `patientservice`.
 *
 * <p>It used to default to an in-memory mock built from invented patient records, and because that
 * default was never overridden the fabricated data was what **production** rendered — clinical
 * screens showing patients who do not exist, indistinguishable on screen from ones who do. The mock
 * now lives in `./testing/`, is imported only by specs, and is absent from the application bundle.
 *
 * <p>The consequence is deliberate and was chosen over the alternative: where an endpoint does not
 * exist yet, the dashboard shows an empty or error state rather than something invented. An empty
 * screen is accurate. See `../../../../docs/phase_4_contract_reconciliation.md` for which contracts
 * are still outstanding.
 */
export const HEALTH_CONNECT_REPOSITORY = new InjectionToken<HealthConnectRepository>('HEALTH_CONNECT_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(HttpHealthConnectRepository),
});
