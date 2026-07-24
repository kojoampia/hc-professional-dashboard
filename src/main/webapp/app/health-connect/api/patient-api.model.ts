/**
 * Patient Directory / Record REST contracts — see application-migration.md
 * Phase 1 / work/phase-1.md. Backed by a new `patientService` `Patient`
 * resource that does not exist yet anywhere in this repo's microservices.
 */

export type PatientSexDto = 'female' | 'male' | 'unspecified';

export interface PatientListItemDto {
  id: string;
  patientName: string;
  lastActivityAt: string;
  sex: PatientSexDto;
  isChild: boolean;
}

export interface EmergencyContactDto {
  name: string;
  phone: string;
}

export interface RecordEntryDto {
  id: string;
  occurredAt: string;
  label: string;
}

export interface ActivityLogEntryDto extends RecordEntryDto {
  title: string;
  description: string;
  createdAt: string;
}

export interface ClinicalReportDto extends RecordEntryDto {
  reportType: string;
  url?: string;
}

export interface CaseSummaryDto {
  id: string;
  openedAt: string;
  brief: string;
  status: 'urgent' | 'open' | 'closed';
}

export interface PatientRecordDto extends PatientListItemDto {
  dateOfBirth: string;
  phone: string;
  email: string;
  emergencyContact?: EmergencyContactDto;
  avatarUrl?: string;
  cases: CaseSummaryDto[];
  visitations: RecordEntryDto[];
  activities: ActivityLogEntryDto[];
  medications: RecordEntryDto[];
  reports: ClinicalReportDto[];
}

export interface CreateActivityDto {
  title: string;
  description: string;
}

export interface CreateReportDto {
  reportType: string;
  url?: string;
}
