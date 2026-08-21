import { AbsenceDto, AbsenceStatus, AbsenceType } from '../api/absence-api.service';
import { DutyRosterAssignmentDto } from '../api/duty-roster-assignments.service';
import { DutyRosterShift, shiftStartHour } from '../health-connect.models';
import { isIsoDate } from './calendar-date.util';

/**
 * What one day of the roster calendar shows (docs/duty-roster.md § Colour, DR5).
 *
 * <p>The grids render this and nothing else, so the rule for "what colour is this day" lives in one
 * place and is unit-testable without a DOM. Both grids and, at DR7, the year view read the same
 * shape.
 */
export interface RosterDay {
  /** ISO date. */
  date: string;
  /** Shifts assigned on this date, in window order. Empty is an ordinary state, not a failure. */
  shifts: DutyRosterShift[];
  /** The absence covering this day, if any. */
  absence: { type: AbsenceType; status: AbsenceStatus } | null;
}

/**
 * The visual state of a day, which is not the same thing as its data.
 *
 * <p>`off` is the absence of everything and takes no fill — the page is cream, so a white cell would
 * read as a filled state rather than an empty one (§ Colour). The other four each mean something is
 * true of the day.
 */
export type RosterDayTone = 'working' | 'holiday' | 'sick' | 'other' | 'off';

const TONE_BY_ABSENCE_TYPE: Record<AbsenceType, RosterDayTone> = {
  HOLIDAY: 'holiday',
  SICK: 'sick',
  OTHER: 'other',
};

/**
 * The tone a day renders in.
 *
 * <p><b>Absence wins over work, and that is the useful way round.</b> A day carrying both a round and
 * an absence means leave was asked for — or granted — over a shift that has not been reassigned, and
 * `assignedRoundsDuring` on the server is what stops the *approval*, not the display. Colouring such
 * a day as ordinary work would hide exactly the conflict an administrator needs to see; colouring it
 * as leave, with the shift still listed in the cell, shows both. See DR4's note that neither field
 * suppresses the other.
 */
export const toneOf = (day: RosterDay): RosterDayTone => {
  if (day.absence) {
    return TONE_BY_ABSENCE_TYPE[day.absence.type];
  }
  return day.shifts.length > 0 ? 'working' : 'off';
};

/** True when the day's absence is asked for but not granted — the hatched rendering. */
export const isPending = (day: RosterDay): boolean => day.absence?.status === 'REQUESTED';

/**
 * Index assignments and absences by ISO date, for the days in `dates`.
 *
 * <p><b>Absences arrive as ranges and are expanded per day here</b>, which is the step that is easy
 * to skip: an absence from the 3rd to the 5th is one record and three coloured cells, and indexing it
 * by `fromDate` alone leaves the 4th and 5th blank while looking like it worked. The server's year
 * summary does the same expansion for the same reason.
 *
 * <p>Where two absences cover one day, an `APPROVED` one wins a day it shares with a `REQUESTED` one
 * — it is the one that actually stops the clinician working, and it is the safer thing to render.
 * This mirrors `DutyRosterService.summariseYear` exactly; the two must agree or the month grid and
 * the year view will colour the same day differently.
 */
export const buildRosterDays = (
  dates: readonly string[],
  assignments: readonly DutyRosterAssignmentDto[],
  absences: readonly AbsenceDto[],
): Map<string, RosterDay> => {
  const days = new Map<string, RosterDay>(dates.map(date => [date, { date, shifts: [], absence: null }]));

  for (const assignment of assignments) {
    const day = days.get(assignment.date);
    if (day) {
      day.shifts.push(assignment.shift);
    }
  }
  for (const day of days.values()) {
    // Window order, so a cell reads down the day. FLEXIBLE sorts with DAY's start hour and is
    // pushed last by the tie-break, since it spans the whole date and has no real start.
    day.shifts.sort((a, b) => shiftStartHour(a) - shiftStartHour(b) || (a === 'FLEXIBLE' ? 1 : b === 'FLEXIBLE' ? -1 : 0));
  }

  for (const absence of absences) {
    if (!isIsoDate(absence.fromDate) || !isIsoDate(absence.toDate)) {
      continue;
    }
    for (const day of days.values()) {
      if (day.date < absence.fromDate || day.date > absence.toDate) {
        continue;
      }
      const existing = day.absence;
      if (!existing || (existing.status !== 'APPROVED' && absence.status === 'APPROVED')) {
        day.absence = { type: absence.type, status: absence.status };
      }
    }
  }

  return days;
};
