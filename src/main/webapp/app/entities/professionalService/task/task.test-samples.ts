import dayjs from 'dayjs/esm';

import { ITask, NewTask } from './task.model';

export const sampleWithRequiredData: ITask = {
  id: 'ca5a8135-f7fa-4a24-a9ea-9206f0a0a542',
};

export const sampleWithPartialData: ITask = {
  id: 'eccef8fb-a50c-4e04-bf2d-2dc0bcd57c2c',
  description: 'fatally',
  duration: 24287.97,
  teamId: 'officer',
  createdDate: dayjs('2024-02-06'),
};

export const sampleWithFullData: ITask = {
  id: '603b73de-0fe7-48f1-a4af-4cc6f7e32fa4',
  name: 'yowza ew yippee',
  description: 'portly',
  schedule: dayjs('2024-02-06'),
  duration: 7906.16,
  attendantId: 'decriminalize cooked beside',
  teamId: 'worth till transport',
  patientId: 'narrow during',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
  createdBy: 'unless green lest',
  modifiedBy: 'nor notwithstanding',
};

export const sampleWithNewData: NewTask = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
