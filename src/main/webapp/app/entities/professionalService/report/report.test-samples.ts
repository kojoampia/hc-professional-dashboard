import dayjs from 'dayjs/esm';

import { IReport, NewReport } from './report.model';

export const sampleWithRequiredData: IReport = {
  id: '49428f42-cbc0-4f30-8a83-27dae5b5d5a5',
};

export const sampleWithPartialData: IReport = {
  id: '8e22dab1-19de-4d57-8a6b-ed80db5e1eb2',
  category: 'artistic uh-huh react',
  url: 'https://unaware-term.name',
  createdDate: dayjs('2024-02-06'),
  createdBy: 'lest waft',
  modifiedBy: 'midwife untried',
};

export const sampleWithFullData: IReport = {
  id: 'f239ef39-ffd7-44d7-92fa-771d957cc0be',
  category: 'so miserable indeed',
  description: 'till though',
  name: 'and',
  url: 'https://warmhearted-king.info/',
  createdDate: dayjs('2024-02-06'),
  modifiedDate: dayjs('2024-02-06'),
  createdBy: 'phooey remarkable',
  modifiedBy: 'boo than finally',
};

export const sampleWithNewData: NewReport = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
