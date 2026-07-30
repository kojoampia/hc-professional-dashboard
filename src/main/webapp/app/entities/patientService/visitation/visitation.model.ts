import dayjs from 'dayjs/esm';

export interface IVisitation {
  id: string;
  patientId?: string | null;
  occurredAt?: dayjs.Dayjs | null;
  label?: string | null;
}

export type NewVisitation = Omit<IVisitation, 'id'> & { id: null };
