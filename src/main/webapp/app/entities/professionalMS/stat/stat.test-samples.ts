import dayjs from 'dayjs/esm';

import { IStat, NewStat } from './stat.model';

export const sampleWithRequiredData: IStat = {
  id: '13026c7a-1147-4ad2-a3d5-b08904bc6d9b',
};

export const sampleWithPartialData: IStat = {
  id: 'cb5c08cb-120c-4dbc-b346-5b0ff159e317',
  type: 'woot',
  name: 'seclude',
  description: 'chase tricky',
  createdDate: dayjs('2024-02-06'),
  createdBy: 'jack',
};

export const sampleWithFullData: IStat = {
  id: 'e5cecf05-5a42-4d46-bda8-afba0aad13c4',
  type: 'allow',
  name: 'or charm',
  description: 'hike lychee yuck',
  value: 30397.55,
  note: 'cartel mechanise to',
  createdDate: dayjs('2024-02-06'),
  createdBy: 'helpless queasily esteemed',
};

export const sampleWithNewData: NewStat = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
