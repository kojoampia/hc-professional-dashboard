import dayjs from 'dayjs/esm';

import { IAddress, NewAddress } from './address.model';

export const sampleWithRequiredData: IAddress = {
  id: 'b6bbfee3-fac1-4fd2-b994-dc6d6e0d1a4a',
};

export const sampleWithPartialData: IAddress = {
  id: '8607b449-2fb3-4209-9b1f-b208262ac6d7',
  digitalAddress: 'planter injustice',
  state: 'while',
  region: 'plenty scarily vainly',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
  createdBy: 'annually',
  modifiedBy: 'merrily idea reshape',
};

export const sampleWithFullData: IAddress = {
  id: 'db3e5cdb-19df-4acf-ac93-14ad9cf688a1',
  digitalAddress: 'prepone gadzooks',
  streetAddress: 'vacuum comfort',
  areaCode: 'parole',
  town: 'abaft instead',
  city: 'West Everardo',
  district: 'sheepishly bewitched than',
  state: 'ick',
  region: 'avaricious',
  country: 'Guinea-Bissau',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
  createdBy: 'along candidate',
  modifiedBy: 'yowza manifestation glasses',
};

export const sampleWithNewData: NewAddress = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
