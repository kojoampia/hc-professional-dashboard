import dayjs from 'dayjs/esm';

import { IDocument, NewDocument } from './document.model';

export const sampleWithRequiredData: IDocument = {
  id: 'd73fe592-5ffb-420c-b189-0e268e08fa56',
};

export const sampleWithPartialData: IDocument = {
  id: '31782ef4-07fb-40f8-b2c2-1feb43606811',
  profileId: 'overreact who shaft',
  type: 'OTHER',
  createdDate: dayjs('2024-03-20'),
  createdBy: 'how',
  modifiedBy: 'because fooey',
};

export const sampleWithFullData: IDocument = {
  id: 'f0e5752e-2dfa-4fee-9c52-1c7118905599',
  name: 'an ugh our',
  profileId: 'per iterate',
  data: '../fake-data/blob/hipster.png',
  dataContentType: 'unknown',
  type: 'PASSPHOTO',
  createdDate: dayjs('2024-03-20'),
  modifiedDate: dayjs('2024-03-20'),
  createdBy: 'uh-huh ouch',
  modifiedBy: 'around crossly',
};

export const sampleWithNewData: NewDocument = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
