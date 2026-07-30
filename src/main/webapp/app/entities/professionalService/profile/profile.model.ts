import dayjs from 'dayjs/esm';

export interface IProfile {
  id: string;
  firstName?: string | null;
  middleNames?: string | null;
  lastName?: string | null;
  team?: string | null;
  birthDate?: dayjs.Dayjs | null;
  sex?: string | null;
  mobilePhone?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  documents?: string | null;
  address?: string | null;
  bankAccount?: string | null;
  tenantId?: string | null;
  rosterId?: string | null;
  teamId?: string | null;
}

export type NewProfile = Omit<IProfile, 'id'> & { id: null };
