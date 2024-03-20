import dayjs from 'dayjs/esm';

import { IProfile, NewProfile } from './profile.model';

export const sampleWithRequiredData: IProfile = {
  id: '9d88b2f3-0b52-413c-8fcd-e9a2de486dea',
};

export const sampleWithPartialData: IProfile = {
  id: '500649ca-68ec-4cac-8fd5-d4c19c50e3b4',
  firstName: 'Camille',
  birthDate: dayjs('2024-02-06'),
  sex: 'though whose',
  mobilePhone: 'deodorant maid down',
  idType: 'rural blank',
  contacts: 'expert necessity',
};

export const sampleWithFullData: IProfile = {
  id: '278c67b5-13b2-4142-86e5-d687b96bad8b',
  firstName: 'Jakob',
  middleNames: 'bonk',
  lastName: 'Schulist',
  membership: 'lasting',
  birthDate: dayjs('2024-02-06'),
  sex: 'excluding',
  mobilePhone: 'duh',
  phoneNumber: 'boohoo um whether',
  email: 'Shannon.Weber25@yahoo.com',
  idType: 'altruistic through',
  idNumber: 'stultify compartmentalise',
  contacts: 'within yellowjacket',
  address: 'bogus',
};

export const sampleWithNewData: NewProfile = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
