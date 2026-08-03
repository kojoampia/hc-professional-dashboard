export interface IHealthConnectProfessional {
  id: string;
  accountLogin?: string | null;
  name?: string | null;
  role?: string | null;
}

export type NewHealthConnectProfessional = Omit<IHealthConnectProfessional, 'id'> & { id: null };
