import { ITeam, NewTeam } from './team.model';

export const sampleWithRequiredData: ITeam = {
  id: '08a62f88-9845-4f9e-b824-247328a84195',
};

export const sampleWithPartialData: ITeam = {
  id: '95d65088-6048-4bf2-b85a-24128687dfac',
  name: 'aha',
  description: 'blissfully blight dip',
  contact: 'cradle',
};

export const sampleWithFullData: ITeam = {
  id: '5e87dfa2-70fa-4ceb-aee6-7fa4e39d94f5',
  name: 'pungent',
  description: 'busy stepmother',
  contact: 'boy like',
};

export const sampleWithNewData: NewTeam = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
