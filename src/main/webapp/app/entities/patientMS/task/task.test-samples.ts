import dayjs from 'dayjs/esm';

import { ITask, NewTask } from './task.model';

export const sampleWithRequiredData: ITask = {
  id: 'ca5a8135-f7fa-4a24-a9ea-9206f0a0a542',
};

export const sampleWithPartialData: ITask = {
  id: 'beeccef8-fba5-40ce-804f-2d2dc0bcd57c',
  description: 'accentuate along badly',
  duration: 7534.43,
  createdDate: dayjs('2024-02-06'),
  createdBy: 'drat dinner',
};

export const sampleWithFullData: ITask = {
  id: 'cc6f7e32-fa49-4ec7-9da6-1234928a491d',
  name: 'median where huzzah',
  description: 'abaft encroach',
  schedule: dayjs('2024-02-06'),
  duration: 22846.85,
  attendant: 'drill',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
  createdBy: 'transport um cap',
  modifiedBy: 'happily that',
};

export const sampleWithNewData: NewTask = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
