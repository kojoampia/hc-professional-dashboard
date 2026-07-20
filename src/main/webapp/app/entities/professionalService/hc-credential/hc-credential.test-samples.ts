import dayjs from 'dayjs/esm';

import { IHCCredential, NewHCCredential } from './hc-credential.model';

export const sampleWithRequiredData: IHCCredential = {
  id: '00533426-fc44-42e1-802e-a63cbc9e81c2',
};

export const sampleWithPartialData: IHCCredential = {
  id: '412b73cc-a71b-4828-b430-c614439480fe',
  email: 'Rigoberto89@gmail.com',
  role: 'rug yuck over',
};

export const sampleWithFullData: IHCCredential = {
  id: '5c5ee684-6e21-40bf-bd4b-31c7646edb9d',
  email: 'Aditya36@yahoo.com',
  phoneNumber: 'amidst reminisce',
  password: 'freely optimistic',
  role: 'aw',
  createdDate: dayjs('2024-02-05'),
  active: true,
  modifiedDate: dayjs('2024-02-06'),
};

export const sampleWithNewData: NewHCCredential = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
