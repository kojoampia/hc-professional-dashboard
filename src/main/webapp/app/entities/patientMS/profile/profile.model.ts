import dayjs from 'dayjs/esm';

export interface IProfile {
  id: string;
  firstName?: string | null;
  middleNames?: string | null;
  lastName?: string | null;
  membership?: string | null;
  birthDate?: dayjs.Dayjs | null;
  sex?: string | null;
  mobilePhone?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  contacts?: string | null;
  address?: string | null;
}

export type NewProfile = Omit<IProfile, 'id'> & { id: null };
