import dayjs from 'dayjs/esm';

import { ICondition, NewCondition } from './condition.model';

export const sampleWithRequiredData: ICondition = {
  id: '7de9afc9-1807-4599-98c6-07703f982a2a',
};

export const sampleWithPartialData: ICondition = {
  id: 'a4ea1a17-4d91-40a4-9b1e-45e2a597b273',
  description: 'anti uh-huh gibber',
  createdBy: 'whoa instead sadly',
};

export const sampleWithFullData: ICondition = {
  id: 'd8518079-cbaf-46fa-92a1-ae03786210a2',
  name: 'why brr foolish',
  description: 'sweaty legal biosphere',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
  createdBy: 'favorable onto',
  modifiedBy: 'well-off',
};

export const sampleWithNewData: NewCondition = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
