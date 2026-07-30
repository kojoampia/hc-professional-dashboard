import dayjs from 'dayjs/esm';

import { IProfile, NewProfile } from './profile.model';

export const sampleWithRequiredData: IProfile = {
  id: '93b3b7f0-e241-48b2-be0d-5215a59c1f97',
};

export const sampleWithPartialData: IProfile = {
  id: '41f93e6a-7a3c-4620-b49b-742b225d708e',
  firstName: 'Alfreda',
  middleNames: 'always aw',
  mobilePhone: 'integer well barring',
  documents: 'inculcate throughout',
  address: 'leap',
  tenantId: 'oof fiercely',
  teamId: 'pfft afore',
};

export const sampleWithFullData: IProfile = {
  id: 'e4528582-c76e-41ab-bab6-3b2ccd139d88',
  firstName: 'Ettie',
  middleNames: 'contrast scientific',
  lastName: 'Cole',
  team: 'suddenly gruesome',
  birthDate: dayjs('2024-02-06'),
  sex: 'gee',
  mobilePhone: 'equally',
  phoneNumber: 'skyscraper spear yahoo',
  email: 'Antone63@gmail.com',
  idType: 'whereas astride grizzled',
  idNumber: 'instead psst',
  documents: 'sometimes',
  address: 'what',
  bankAccount: 'gracefully swat preregister',
  tenantId: 'between loyally',
  rosterId: 'phew separately reckless',
  teamId: 'delightfully hence',
};

export const sampleWithNewData: NewProfile = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
