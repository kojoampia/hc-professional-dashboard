import dayjs from 'dayjs/esm';

import { ITask, NewTask } from './task.model';

export const sampleWithRequiredData: ITask = {
  id: '48d52277-8822-451c-b2af-8ac2d6db7e44',
};

export const sampleWithPartialData: ITask = {
  id: '7abc2acf-3938-413e-9232-715e995538fc',
  name: 'versus wherever criminal',
  duration: 4261.4,
  attendantId: 'countess arrogantly',
  teamId: 'when',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
};

export const sampleWithFullData: ITask = {
  id: '680ee62d-cbd3-4f39-ad5a-8e3732304692',
  name: 'condense familiar barring',
  description: 'hm zowie',
  schedule: dayjs('2024-02-06'),
  duration: 25642.63,
  attendantId: 'lumbering',
  teamId: 'terrible till',
  patientId: 'neck gadzooks worriedly',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
  createdBy: 'elegantly',
  modifiedBy: 'wilted ick',
};

export const sampleWithNewData: NewTask = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
