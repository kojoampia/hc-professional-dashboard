import dayjs from 'dayjs/esm';

import { PatientSex } from 'app/entities/enumerations/patient-sex.model';

export interface IPatient {
  id: string;
  patientName?: string | null;
  lastActivityAt?: dayjs.Dayjs | null;
  sex?: keyof typeof PatientSex | null;
  isChild?: boolean | null;
  dateOfBirth?: dayjs.Dayjs | null;
  phone?: string | null;
  email?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  avatarUrl?: string | null;
}

export type NewPatient = Omit<IPatient, 'id'> & { id: null };
