import dayjs from 'dayjs/esm';

export interface IMetadata {
  id: string;
  createdBy?: string | null;
  modifiedBy?: string | null;
  createdDate?: dayjs.Dayjs | null;
  modifiedDate?: dayjs.Dayjs | null;
  data?: string | null;
}

export type NewMetadata = Omit<IMetadata, 'id'> & { id: null };
