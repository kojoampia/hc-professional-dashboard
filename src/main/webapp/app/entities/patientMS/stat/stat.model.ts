import dayjs from 'dayjs/esm';

export interface IStat {
  id: string;
  type?: string | null;
  name?: string | null;
  description?: string | null;
  value?: number | null;
  note?: string | null;
  createdDate?: dayjs.Dayjs | null;
  createdBy?: string | null;
}

export type NewStat = Omit<IStat, 'id'> & { id: null };
