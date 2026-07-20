import dayjs from 'dayjs/esm';

export interface IMedCase {
  id: string;
  symptoms?: string | null;
  diagnoses?: string | null;
  recommendations?: string | null;
  createdDate?: dayjs.Dayjs | null;
  createdBy?: string | null;
  modifiedDate?: dayjs.Dayjs | null;
  modifiedBy?: string | null;
}

export type NewMedCase = Omit<IMedCase, 'id'> & { id: null };
