import dayjs from 'dayjs/esm';

export interface ITask {
  id: string;
  name?: string | null;
  description?: string | null;
  schedule?: dayjs.Dayjs | null;
  duration?: number | null;
  attendant?: string | null;
  createdDate?: dayjs.Dayjs | null;
  modifiedDate?: dayjs.Dayjs | null;
  createdBy?: string | null;
  modifiedBy?: string | null;
}

export type NewTask = Omit<ITask, 'id'> & { id: null };
