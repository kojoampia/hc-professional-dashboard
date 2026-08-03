import dayjs from 'dayjs/esm';

import { IDutyShift, NewDutyShift } from './duty-shift.model';

export const sampleWithRequiredData: IDutyShift = {
  id: '5a9938be-4213-4253-9b26-54727b8a056e',
};

export const sampleWithPartialData: IDutyShift = {
  id: 'c2a95a87-7707-4efd-8f68-f1b44f05c47b',
  startsAt: dayjs('2026-07-23T13:13'),
  endsAt: dayjs('2026-07-23T11:28'),
  status: 'COMPLETED',
};

export const sampleWithFullData: IDutyShift = {
  id: '9ef1518a-1306-455f-a557-0a22cf6f2261',
  professionalId: 'pear',
  startsAt: dayjs('2026-07-23T06:33'),
  endsAt: dayjs('2026-07-23T22:48'),
  status: 'ACTIVE',
};

export const sampleWithNewData: NewDutyShift = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
