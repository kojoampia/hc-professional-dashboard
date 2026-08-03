import dayjs from 'dayjs/esm';

export interface IActivityLogEntry {
  id: string;
  patientId?: string | null;
  occurredAt?: dayjs.Dayjs | null;
  label?: string | null;
  title?: string | null;
  description?: string | null;
  createdAt?: dayjs.Dayjs | null;
}

export type NewActivityLogEntry = Omit<IActivityLogEntry, 'id'> & { id: null };
