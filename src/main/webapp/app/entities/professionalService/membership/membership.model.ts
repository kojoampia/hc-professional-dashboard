import dayjs from 'dayjs/esm';

export interface IMembership {
  id: string;
  name?: string | null;
  description?: string | null;
  status?: string | null;
  createdDate?: dayjs.Dayjs | null;
  modifiedDate?: dayjs.Dayjs | null;
  createdBy?: string | null;
  modifiedBy?: string | null;
}

export type NewMembership = Omit<IMembership, 'id'> & { id: null };
