import dayjs from 'dayjs/esm';

import { IClinicalReport, NewClinicalReport } from './clinical-report.model';

export const sampleWithRequiredData: IClinicalReport = {
  id: 'd903fe1d-1b03-48b2-b04c-4907c567957f',
};

export const sampleWithPartialData: IClinicalReport = {
  id: '9444b45d-c19e-4f4f-8b21-4a7982ea9b4d',
  reportType: 'subdued upside-down hmph',
};

export const sampleWithFullData: IClinicalReport = {
  id: 'df661f2a-edae-4d2d-a042-02068676594b',
  patientId: 'extent anenst unless',
  occurredAt: dayjs('2026-07-24T03:40'),
  label: 'over',
  reportType: 'thigh clear-cut about',
  url: 'https://alert-reach.info',
};

export const sampleWithNewData: NewClinicalReport = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
