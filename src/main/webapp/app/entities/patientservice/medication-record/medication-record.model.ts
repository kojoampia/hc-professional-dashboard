import dayjs from 'dayjs/esm';

export interface IMedicationRecord {
  id: string;
  patientId?: string | null;
  occurredAt?: dayjs.Dayjs | null;
  label?: string | null;
}

export type NewMedicationRecord = Omit<IMedicationRecord, 'id'> & { id: null };
