import dayjs from 'dayjs/esm';

import { IMedCase, NewMedCase } from './med-case.model';

export const sampleWithRequiredData: IMedCase = {
  id: '89059e5d-7b09-431e-88f7-2d08fd29807b',
};

export const sampleWithPartialData: IMedCase = {
  id: 'fb0bff09-b1c6-4acf-9123-df8a7d97fae6',
  symptoms: 'zowie interior',
  diagnoses: 'furlough evenly',
  createdDate: dayjs('2026-07-20T08:13'),
  createdBy: 'vaguely which altruistic',
};

export const sampleWithFullData: IMedCase = {
  id: '522d74b9-1310-49ba-be27-ba63ac77e71d',
  symptoms: 'inure',
  diagnoses: 'emphasise',
  recommendations: 'unnecessarily',
  createdDate: dayjs('2026-07-20T00:09'),
  createdBy: 'adventurously or',
  modifiedDate: dayjs('2026-07-20T10:45'),
  modifiedBy: 'beside',
};

export const sampleWithNewData: NewMedCase = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
