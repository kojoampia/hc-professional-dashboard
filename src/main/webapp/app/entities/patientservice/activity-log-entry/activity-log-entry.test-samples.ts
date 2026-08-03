import dayjs from 'dayjs/esm';

import { IActivityLogEntry, NewActivityLogEntry } from './activity-log-entry.model';

export const sampleWithRequiredData: IActivityLogEntry = {
  id: '58b1344f-0505-49f6-a521-7dfa8d51b35d',
};

export const sampleWithPartialData: IActivityLogEntry = {
  id: '70ed7f74-4b42-449e-af5b-c53fce6bbbe1',
  occurredAt: dayjs('2026-07-24T04:46'),
  title: 'solicit unlike immediately',
  description: 'gosh deplore',
};

export const sampleWithFullData: IActivityLogEntry = {
  id: '6bc3f4c1-de32-4f9a-b9f2-738445f41a1d',
  patientId: 'viability when gah',
  occurredAt: dayjs('2026-07-23T23:35'),
  label: 'noteworthy',
  title: 'geez',
  description: 'geez ride fork',
  createdAt: dayjs('2026-07-23T20:52'),
};

export const sampleWithNewData: NewActivityLogEntry = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
