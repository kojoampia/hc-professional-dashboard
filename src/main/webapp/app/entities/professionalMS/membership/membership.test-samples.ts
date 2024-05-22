import dayjs from 'dayjs/esm';

import { IMembership, NewMembership } from './membership.model';

export const sampleWithRequiredData: IMembership = {
  id: '661cc578-5629-4b9f-951c-eea52a1c3488',
};

export const sampleWithPartialData: IMembership = {
  id: '199286d2-cd9c-4807-b717-73ee2ad735ee',
  name: 'where innocently',
  description: 'till yowza injure',
  status: 'pamper slim',
  createdDate: dayjs('2024-02-06'),
  createdBy: 'daily likewise quickly',
};

export const sampleWithFullData: IMembership = {
  id: '189fb433-639d-4c80-9420-465db98040b3',
  name: 'curiously upon',
  description: 'fussy arrogantly careful',
  status: 'unless',
  createdDate: dayjs('2024-02-05'),
  modifiedDate: dayjs('2024-02-06'),
  createdBy: 'phew though sick',
  modifiedBy: 'aside',
};

export const sampleWithNewData: NewMembership = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
