import dayjs from 'dayjs/esm';

export interface IClinicalReport {
  id: string;
  patientId?: string | null;
  occurredAt?: dayjs.Dayjs | null;
  label?: string | null;
  reportType?: string | null;
  url?: string | null;
}

export type NewClinicalReport = Omit<IClinicalReport, 'id'> & { id: null };
