import dayjs from 'dayjs/esm';

export interface IHCCredential {
  id: string;
  email?: string | null;
  phoneNumber?: string | null;
  password?: string | null;
  role?: string | null;
  createdDate?: dayjs.Dayjs | null;
  active?: boolean | null;
  modifiedDate?: dayjs.Dayjs | null;
}

export type NewHCCredential = Omit<IHCCredential, 'id'> & { id: null };
