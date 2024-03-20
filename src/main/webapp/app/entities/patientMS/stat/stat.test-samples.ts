import dayjs from 'dayjs/esm';

import { IStat, NewStat } from './stat.model';

export const sampleWithRequiredData: IStat = {
  id: '13026c7a-1147-4ad2-a3d5-b08904bc6d9b',
};

export const sampleWithPartialData: IStat = {
  id: '2cb5c08c-b120-4cdb-9c34-65b0ff159e31',
  name: 'yuck instructor wildly',
  description: 'notwithstanding hoof phew',
  value: 29102.36,
  createdBy: 'finally pungent under',
};

export const sampleWithFullData: IStat = {
  id: '13c4f2b0-39eb-4063-b5e5-3b86f33852ef',
  name: 'and even',
  description: 'sweat across since',
  value: 15005.93,
  note: 'vaporise alter',
  createdDate: dayjs('2024-02-06'),
  createdBy: 'probable supposing',
};

export const sampleWithNewData: NewStat = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
