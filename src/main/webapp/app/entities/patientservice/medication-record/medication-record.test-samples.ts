import dayjs from 'dayjs/esm';

import { IMedicationRecord, NewMedicationRecord } from './medication-record.model';

export const sampleWithRequiredData: IMedicationRecord = {
  id: '489adf51-b200-4ba0-acf3-2d4e4d679cc8',
};

export const sampleWithPartialData: IMedicationRecord = {
  id: 'ec55dd24-64db-4885-880c-3d3743ba4c6b',
  label: 'gently',
};

export const sampleWithFullData: IMedicationRecord = {
  id: 'c2b9618f-4c6a-4d4b-af09-27b24ce1b87f',
  patientId: 'supposing',
  occurredAt: dayjs('2026-07-23T20:20'),
  label: 'the',
};

export const sampleWithNewData: NewMedicationRecord = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
