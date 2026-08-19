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
import { HttpHealthConnectRepository } from './http-health-connect.repository';

export interface PatientDirectoryFilters {
  gender?: PatientSex;
  childrenOnly?: boolean;
}

export interface HealthConnectRepository {
  readonly patients: Signal<readonly PatientRecord[]>;
  readonly dutyRosters: Signal<readonly DutyRoster[]>;
  /**
   * Per-source load state. Screens should read the one they depend on; {@link #asyncState} is the
   * aggregate for screens reading both, and errors only when every source failed.
   */
  readonly patientsState: Signal<AsyncViewState>;
  readonly casesState: Signal<AsyncViewState>;
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
