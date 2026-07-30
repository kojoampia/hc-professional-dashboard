import dayjs from 'dayjs/esm';

import { DutyShiftStatus } from 'app/entities/enumerations/duty-shift-status.model';
import { IDutyRoster } from 'app/entities/professionalService/duty-roster/duty-roster.model';

export interface IDutyShift {
  id: string;
  professionalId?: string | null;
  startsAt?: dayjs.Dayjs | null;
  endsAt?: dayjs.Dayjs | null;
  status?: keyof typeof DutyShiftStatus | null;
  roster?: IDutyRoster | null;
}

export type NewDutyShift = Omit<IDutyShift, 'id'> & { id: null };
