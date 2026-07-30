import { IHealthConnectProfessional } from 'app/entities/professionalService/health-connect-professional/health-connect-professional.model';

export interface IDutyRoster {
  id: string;
  name?: string | null;
  subscribedProfessionals?: IHealthConnectProfessional[] | null;
}

export type NewDutyRoster = Omit<IDutyRoster, 'id'> & { id: null };
