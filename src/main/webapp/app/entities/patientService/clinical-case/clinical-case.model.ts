import dayjs from 'dayjs/esm';

import { CaseStatus } from 'app/entities/enumerations/case-status.model';
import { IRecommendation } from 'app/entities/patientService/recommendation/recommendation.model';

export interface IClinicalCase {
  id: string;
  patientId?: string | null;
  openedAt?: dayjs.Dayjs | null;
  brief?: string | null;
  status?: keyof typeof CaseStatus | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  assignedProfessionalId?: string | null;
  assignedRosterId?: string | null;
  recommendations?: IRecommendation[] | null;
}

export type NewClinicalCase = Omit<IClinicalCase, 'id'> & { id: null };
