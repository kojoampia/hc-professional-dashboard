import dayjs from 'dayjs/esm';

import { IMetadata, NewMetadata } from './metadata.model';

export const sampleWithRequiredData: IMetadata = {
  id: 'c492ab6b-af1d-4349-857d-89dffc4ea3d0',
};

export const sampleWithPartialData: IMetadata = {
  id: '84fd333f-296e-4c85-9cef-f93107db42a3',
  modifiedBy: 'despite afterwards',
  modifiedDate: dayjs('2024-02-06'),
};

export const sampleWithFullData: IMetadata = {
  id: 'bbfa8565-dc77-4e34-9c8e-df46c269f68a',
  createdBy: 'scour even',
  modifiedBy: 'antiquity',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-05'),
  data: 'curiously verbally',
};

export const sampleWithNewData: NewMetadata = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
