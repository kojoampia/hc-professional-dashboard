import dayjs from 'dayjs/esm';

import { IProfile, NewProfile } from './profile.model';

export const sampleWithRequiredData: IProfile = {
  id: '9d88b2f3-0b52-413c-8fcd-e9a2de486dea',
};

export const sampleWithPartialData: IProfile = {
  id: '00649ca6-8ecc-4acf-8d5d-4c19c50e3b42',
  firstName: 'Jaylan',
  birthDate: dayjs('2024-02-06'),
  sex: 'any',
  mobilePhone: 'hellcat',
  cardType: 'spelling impound',
  contacts: 'singer hungrily whereas',
  team: 'barter insight',
};

export const sampleWithFullData: IProfile = {
  id: '8c67b513-b214-426e-85d6-87b96bad8b07',
  firstName: 'Adolphus',
  middleNames: 'thoroughly ick',
  lastName: 'Daniel',
  membership: 'excluding',
  birthDate: dayjs('2024-02-06'),
  sex: 'oof boohoo um',
  mobilePhone: 'pish rarely altruistic',
  phoneNumber: 'hm',
  email: 'Rogers.Berge@yahoo.com',
  cardType: 'compartmentalise nor and',
  cardNumber: 'present fetter synthesis',
  contacts: 'phew sturdy elegantly',
  address: 'fennel whereas',
  team: 'corrupt gee however',
};

export const sampleWithNewData: NewProfile = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
