import dayjs from 'dayjs/esm';

import { IStat, NewStat } from './stat.model';

export const sampleWithRequiredData: IStat = {
  id: '1cb2064d-ebe7-4f84-9859-62bb8ee7fb51',
};

export const sampleWithPartialData: IStat = {
  id: 'c4f3c219-64d1-4645-ad76-81c01d37b5ac',
  type: 'hmph underneath eek',
  name: 'tepid',
  description: 'underneath ick skeletal',
  value: 30189.74,
  note: 'meaningfully gummy',
};

export const sampleWithFullData: IStat = {
  id: '84bf5f2b-95e9-41b0-9225-a363bd473f2a',
  type: 'gratefully',
  name: 'to',
  description: 'aboard',
  value: 1233.38,
  note: 'morning',
  createdDate: dayjs('2024-02-06'),
  createdBy: 'masquerade',
};

export const sampleWithNewData: NewStat = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
