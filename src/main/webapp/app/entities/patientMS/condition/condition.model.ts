import dayjs from 'dayjs/esm';

export interface ICondition {
  id: string;
  name?: string | null;
  description?: string | null;
  createdDate?: dayjs.Dayjs | null;
  modifiedDate?: dayjs.Dayjs | null;
  createdBy?: string | null;
  modifiedBy?: string | null;
}

export type NewCondition = Omit<ICondition, 'id'> & { id: null };
