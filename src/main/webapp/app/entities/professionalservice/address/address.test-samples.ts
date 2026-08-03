import dayjs from 'dayjs/esm';

import { IAddress, NewAddress } from './address.model';

export const sampleWithRequiredData: IAddress = {
  id: '1765b58b-0341-4b86-84d0-7a3416c09633',
};

export const sampleWithPartialData: IAddress = {
  id: '371e5002-ed8c-4ebb-9784-0822cb62d374',
  digitalAddress: 'minion past',
  city: 'Powlowskiworth',
  region: 'yuck defiantly like',
  modifiedBy: 'volunteer inasmuch',
};

export const sampleWithFullData: IAddress = {
  id: '8924d93a-c664-4222-a9fd-a7bcd925bafb',
  digitalAddress: 'reach gosh',
  streetAddress: 'whether',
  areaCode: 'where',
  town: 'opposite equally fortunately',
  city: 'Caguas',
  district: 'across',
  state: 'likewise',
  region: 'hutch or',
  country: 'Saint Vincent and the Grenadines',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
  createdBy: 'before needy recklessly',
  modifiedBy: 'mechanically delightfully tough',
};

export const sampleWithNewData: NewAddress = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
