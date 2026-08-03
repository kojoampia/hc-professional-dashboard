import dayjs from 'dayjs/esm';

import { IActivity, NewActivity } from './activity.model';

export const sampleWithRequiredData: IActivity = {
  id: 'a230b39e-ca09-42e1-8e67-c5da97eb49a0',
};

export const sampleWithPartialData: IActivity = {
  id: '5c8fc162-a6b6-4ef1-b67e-cb14dab003fb',
  name: 'ouch unruly',
  modifiedBy: 'pfft talkative',
};

export const sampleWithFullData: IActivity = {
  id: '7723b9e7-42ff-4920-aee9-926d4e8150d7',
  name: 'red clueless',
  description: 'merge',
  patientId: 'yowza',
  createdDate: dayjs('2024-03-25T22:38'),
  createdBy: 'likewise phew the',
  modifiedDate: dayjs('2024-03-25T17:33'),
  modifiedBy: 'whose regularly',
};

export const sampleWithNewData: NewActivity = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
