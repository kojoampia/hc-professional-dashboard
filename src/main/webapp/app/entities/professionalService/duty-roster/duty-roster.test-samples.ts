import { IDutyRoster, NewDutyRoster } from './duty-roster.model';

export const sampleWithRequiredData: IDutyRoster = {
  id: 'ec8cc14a-1b2e-4b05-84e8-7f7313d521f7',
};

export const sampleWithPartialData: IDutyRoster = {
  id: '9eb693f4-8a36-4d37-9cf5-db29b638b205',
};

export const sampleWithFullData: IDutyRoster = {
  id: 'b72beefc-1b56-4725-bea8-e094161192df',
  name: 'basket',
};

export const sampleWithNewData: NewDutyRoster = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
