import dayjs from 'dayjs/esm';

import { IMedication, NewMedication } from './medication.model';

export const sampleWithRequiredData: IMedication = {
  id: '3eb11dfc-9e38-441c-84dc-9211dc138269',
};

export const sampleWithPartialData: IMedication = {
  id: '6230f48e-ae74-46d6-82fa-c13c1b581e84',
  name: 'buddy tattered',
  createdDate: dayjs('2024-02-06'),
  createdBy: 'hm phew likewise',
  modifiedBy: 'on throughout who',
};

export const sampleWithFullData: IMedication = {
  id: '75b48458-f9b5-42f4-8015-a0feb3da89b0',
  name: 'feedback',
  description: 'hopelessly',
  prescription: 'barring terribly courageously',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
  createdBy: 'jumpy',
  modifiedBy: 'proud',
};

export const sampleWithNewData: NewMedication = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
