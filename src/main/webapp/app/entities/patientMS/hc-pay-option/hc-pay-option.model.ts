export interface IHCPayOption {
  id: string;
  type?: string | null;
  userID?: string | null;
  metadata?: string | null;
}

export type NewHCPayOption = Omit<IHCPayOption, 'id'> & { id: null };
