import { IRecommendation, NewRecommendation } from './recommendation.model';

export const sampleWithRequiredData: IRecommendation = {
  id: '731e6fdf-0a2b-4210-9ea2-1da27f4f8c03',
};

export const sampleWithPartialData: IRecommendation = {
  id: '2c97ecfe-562a-4d3a-933a-60175c4e920b',
};

export const sampleWithFullData: IRecommendation = {
  id: 'fc701c06-c985-4d93-a962-e4e420517348',
  label: 'quietly eternity hasty',
  category: 'spirit',
};

export const sampleWithNewData: NewRecommendation = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
