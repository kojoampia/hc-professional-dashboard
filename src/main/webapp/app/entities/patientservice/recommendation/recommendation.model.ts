export interface IRecommendation {
  id: string;
  label?: string | null;
  category?: string | null;
}

export type NewRecommendation = Omit<IRecommendation, 'id'> & { id: null };
