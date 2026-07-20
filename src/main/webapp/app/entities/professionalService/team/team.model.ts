export interface ITeam {
  id: string;
  name?: string | null;
  description?: string | null;
  contact?: string | null;
}

export type NewTeam = Omit<ITeam, 'id'> & { id: null };
