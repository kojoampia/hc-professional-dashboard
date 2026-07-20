import dayjs from 'dayjs/esm';

export interface IActivity {
  id: string;
  name?: string | null;
  description?: string | null;
  patientId?: string | null;
  createdDate?: dayjs.Dayjs | null;
  createdBy?: string | null;
  modifiedDate?: dayjs.Dayjs | null;
  modifiedBy?: string | null;
}

export type NewActivity = Omit<IActivity, 'id'> & { id: null };
