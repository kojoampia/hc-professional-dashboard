/**
 * Dashboard REST contracts.
 *
 * `DashboardSummaryDto` is the wire shape the dashboard renders, but professionalservice only fills
 * part of it: `patients`, `female`, `male` and `kids`. The case counts are absent from the response
 * and filled in by `HttpHealthConnectRepository` from the clinical cases it already loaded — see
 * `dashboard-api.service.ts` for why they are not served.
 *
 * The remaining three shapes are no longer fetched from anywhere; the charts are computed from the
 * case cache. They are kept because the chart components type against them.
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
