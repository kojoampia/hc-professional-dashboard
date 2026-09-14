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
import { RestrictedPart } from './api/restricted-parts';
import { HttpHealthConnectRepository } from './http-health-connect.repository';

export interface PatientDirectoryFilters {
  gender?: PatientSex;
  childrenOnly?: boolean;
}

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
  readonly asyncState: Signal<AsyncViewState>;
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
  setLoading(loading: boolean): void;
  setError(error: string | null): void;
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
