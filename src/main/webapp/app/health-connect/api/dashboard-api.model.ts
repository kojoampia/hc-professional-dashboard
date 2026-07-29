/**
 * Dashboard REST contracts — see professional-web.md §5
 * (REST contracts). Backed by the `patientService` microservice; none of
 * these endpoints exist yet, this is the spec they're built against.
 */

export interface DashboardSummaryDto {
  patients: number;
  female: number;
  male: number;
  kids: number;
  urgent: number;
  open: number;
  closed: number;
}

export interface CaseTimelinePointDto {
  month: string;
  newCases: number;
  resolvedCases: number;
}

export interface CaseDistributionSegmentDto {
  label: string;
  value: number;
}

export interface PatientGroupSeriesDto {
  group: string;
  new: number;
  returning: number;
}
