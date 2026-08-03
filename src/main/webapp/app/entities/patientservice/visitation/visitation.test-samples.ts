import dayjs from 'dayjs/esm';

import { IVisitation, NewVisitation } from './visitation.model';

export const sampleWithRequiredData: IVisitation = {
  id: '66d7cef0-7761-45c5-93ca-6406ae0cc18e',
};

export const sampleWithPartialData: IVisitation = {
  id: '1567db88-fb64-4f78-b264-6aff1ddf3b1f',
  patientId: 'ack',
  occurredAt: dayjs('2026-07-23T12:11'),
  label: 'rural clamp um',
};

export const sampleWithFullData: IVisitation = {
  id: '55f4ab3a-b46e-4516-b137-3d0320565b9e',
  patientId: 'how log angrily',
  occurredAt: dayjs('2026-07-23T17:54'),
  label: 'subtract so',
};

export const sampleWithNewData: NewVisitation = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
