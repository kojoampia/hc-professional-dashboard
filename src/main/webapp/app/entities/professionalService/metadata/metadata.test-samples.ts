import dayjs from 'dayjs/esm';

import { IMetadata, NewMetadata } from './metadata.model';

export const sampleWithRequiredData: IMetadata = {
  id: '93c1af8d-6aaa-453f-9efb-1e4c493b530b',
};

export const sampleWithPartialData: IMetadata = {
  id: 'b496cd66-9d48-4a90-b587-a4430095e89a',
};

export const sampleWithFullData: IMetadata = {
  id: 'f9e10795-065c-4d7e-b497-ed809f02c876',
  createdBy: 'longingly',
  modifiedBy: 'yum difficult',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
  data: 'provided',
};

export const sampleWithNewData: NewMetadata = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
