import dayjs from 'dayjs/esm';

import { IReport, NewReport } from './report.model';

export const sampleWithRequiredData: IReport = {
  id: 'c21d45eb-8dd7-4ef8-a1c6-c8525a9a98d8',
};

export const sampleWithPartialData: IReport = {
  id: '048c2aa7-7c20-4e50-accd-af7537385448',
  category: 'silk simplify because',
  description: 'fooey pinkie vice',
  name: 'exalted as',
  url: 'https://sad-landform.info',
  modifiedDate: dayjs('2024-02-06'),
};

export const sampleWithFullData: IReport = {
  id: '3298d042-58a8-4813-aa90-142e098aff65',
  category: 'wont complete and',
  description: 'woot rug',
  name: 'leadership',
  url: 'https://attentive-bagel.net',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-05'),
  createdBy: 'yahoo defog tan',
  modifiedBy: 'from',
};

export const sampleWithNewData: NewReport = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
