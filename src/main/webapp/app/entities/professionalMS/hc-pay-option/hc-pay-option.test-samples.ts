import { IHCPayOption, NewHCPayOption } from './hc-pay-option.model';

export const sampleWithRequiredData: IHCPayOption = {
  id: '3382e7b1-5077-4375-a385-cef88b55746b',
};

export const sampleWithPartialData: IHCPayOption = {
  id: '5f2d963e-7058-4b36-b15d-0abee0bff185',
  type: 'useful besides',
  userID: 'vice till long',
  metadata: 'bah brr',
};

export const sampleWithFullData: IHCPayOption = {
  id: '4e7fdb9d-70f1-4c3a-8758-f1a1b95e5298',
  type: 'reliable unexpectedly phew',
  userID: 'slather cultivated',
  metadata: 'oh',
};

export const sampleWithNewData: NewHCPayOption = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
