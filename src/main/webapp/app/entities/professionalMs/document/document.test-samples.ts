import dayjs from 'dayjs/esm';

import { IDocument, NewDocument } from './document.model';

export const sampleWithRequiredData: IDocument = {
  id: '7ae6bd57-153e-4578-ba55-d2cf8ccac695',
};

export const sampleWithPartialData: IDocument = {
  id: 'ccd2a036-15c2-4b8b-b334-612abd3343ae',
  name: 'jaggedly',
  data: '../fake-data/blob/hipster.png',
  dataContentType: 'unknown',
  createdDate: dayjs('2024-03-20'),
};

export const sampleWithFullData: IDocument = {
  id: 'ae8942c4-f11c-4064-b042-ae40209ecb78',
  name: 'amongst dimpled',
  profileId: 'phew apud',
  data: '../fake-data/blob/hipster.png',
  dataContentType: 'unknown',
  type: 'NHIS',
  createdDate: dayjs('2024-03-20'),
  modifiedDate: dayjs('2024-03-20'),
  lastModifiedBy: 'reluctantly coolly',
};

export const sampleWithNewData: NewDocument = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
