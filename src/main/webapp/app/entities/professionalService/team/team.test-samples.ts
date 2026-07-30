import { ITeam, NewTeam } from './team.model';

export const sampleWithRequiredData: ITeam = {
  id: 'f669f9ce-8faf-40b2-bd92-59c77342ae68',
};

export const sampleWithPartialData: ITeam = {
  id: 'caa8b969-d0fa-4dc0-975c-18c5e25089b2',
  name: 'sunbathe tackle',
  description: 'yippee for suddenly',
};

export const sampleWithFullData: ITeam = {
  id: '9b2e8d30-ed7e-4eee-9f9c-7afff9d63854',
  name: 'dead',
  description: 'or',
  contact: 'for',
};

export const sampleWithNewData: NewTeam = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
