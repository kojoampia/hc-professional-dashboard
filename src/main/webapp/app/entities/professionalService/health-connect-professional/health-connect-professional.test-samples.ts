import { IHealthConnectProfessional, NewHealthConnectProfessional } from './health-connect-professional.model';

export const sampleWithRequiredData: IHealthConnectProfessional = {
  id: '601851d8-d5c2-44ce-b0ae-6c7d34764c37',
};

export const sampleWithPartialData: IHealthConnectProfessional = {
  id: '978e5601-b571-4d76-96e0-1a9173b78c10',
  accountLogin: 'husky across dual',
};

export const sampleWithFullData: IHealthConnectProfessional = {
  id: 'f64f795a-5ee5-4d59-b240-117d147a2c0f',
  accountLogin: 'nicely',
  name: 'spring',
  role: 'recede',
};

export const sampleWithNewData: NewHealthConnectProfessional = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
