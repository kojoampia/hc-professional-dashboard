import dayjs from 'dayjs/esm';

import { IPatient, NewPatient } from './patient.model';

export const sampleWithRequiredData: IPatient = {
  id: '1b675df3-31ea-404e-b43c-e3a1e4dd1ad7',
};

export const sampleWithPartialData: IPatient = {
  id: '7b6b8697-875d-489b-a002-be374fc6adf5',
  patientName: 'avow ill-fated',
  lastActivityAt: dayjs('2026-07-24T03:06'),
  isChild: false,
  dateOfBirth: dayjs('2026-07-23'),
  phone: '839-853-3806 x32068',
  email: 'Jayda38@yahoo.com',
  avatarUrl: 'gymnast',
};

export const sampleWithFullData: IPatient = {
  id: '43abbb77-2599-407f-8e96-bde90617b39b',
  patientName: 'wherever',
  lastActivityAt: dayjs('2026-07-24T05:43'),
  sex: 'FEMALE',
  isChild: false,
  dateOfBirth: dayjs('2026-07-23'),
  phone: '1-653-442-2363 x339',
  email: 'Candice.Satterfield@hotmail.com',
  emergencyContactName: 'like sleepily scale',
  emergencyContactPhone: 'meanwhile',
  avatarUrl: 'carefully',
};

export const sampleWithNewData: NewPatient = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
