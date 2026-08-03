import dayjs from 'dayjs/esm';

import { IMedication, NewMedication } from './medication.model';

export const sampleWithRequiredData: IMedication = {
  id: 'ff4295e1-dcb6-4c43-a162-71c69a10e0e2',
};

export const sampleWithPartialData: IMedication = {
  id: '25beceb4-b18a-4664-b9f3-875df616637d',
  name: 'hm',
  prescription: 'card who meanwhile',
  createdDate: dayjs('2024-02-06'),
  modifiedBy: 'boo but',
};

export const sampleWithFullData: IMedication = {
  id: '1555b9a8-9d5f-4473-9751-3e4c8b1c5889',
  name: 'till netsuke',
  description: 'unit wound',
  prescription: 'climb impact',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
  createdBy: 'quarrelsomely',
  modifiedBy: 'before key',
};

export const sampleWithNewData: NewMedication = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
