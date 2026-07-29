/**
 * Duty Roster REST contracts — see professional-web.md §5
 * (REST contracts). Backed by new `professionalService` roster/shift
 * entities that do not exist yet (the closest existing concept, `team`, has
 * no shift/subscription model).
 */

export type DutyShiftStatusDto = 'upcoming' | 'active' | 'completed';

export interface DutyShiftDto {
  id: string;
  rosterId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  status: DutyShiftStatusDto;
}

export interface DutyRosterDto {
  id: string;
  name: string;
  subscribedProfessionalIds: string[];
  shifts: DutyShiftDto[];
}
