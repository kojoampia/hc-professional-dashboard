import dayjs from 'dayjs/esm';

import { IClinicalCase, NewClinicalCase } from './clinical-case.model';

export const sampleWithRequiredData: IClinicalCase = {
  id: '465b07f9-df6c-41dc-a2a3-1d9596d44217',
};

export const sampleWithPartialData: IClinicalCase = {
  id: 'b96d0f0e-ba9c-468a-8e6e-d3c71bce0881',
  symptoms: 'statue',
};

export const sampleWithFullData: IClinicalCase = {
  id: 'bf0a84b3-0512-48ae-9606-3808e8ae8ae8',
  patientId: 'hmph key',
  openedAt: dayjs('2026-07-29T17:24'),
  brief: 'yum commonly modulo',
  status: 'URGENT',
  symptoms: 'sock extension',
  diagnosis: 'cheerfully within',
  assignedProfessionalId: 'offensively ugh afore',
  assignedRosterId: 'blindly',
};

export const sampleWithNewData: NewClinicalCase = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
