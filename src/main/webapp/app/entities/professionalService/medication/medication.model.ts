import dayjs from 'dayjs/esm';

export interface IMedication {
  id: string;
  name?: string | null;
  description?: string | null;
  prescription?: string | null;
  createdDate?: dayjs.Dayjs | null;
  modifiedDate?: dayjs.Dayjs | null;
  createdBy?: string | null;
  modifiedBy?: string | null;
}

export type NewMedication = Omit<IMedication, 'id'> & { id: null };
