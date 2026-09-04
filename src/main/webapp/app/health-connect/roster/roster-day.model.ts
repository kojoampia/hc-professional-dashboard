import { AbsenceDto, AbsenceStatus, AbsenceType } from '../api/absence-api.service';
import { DaySummaryDto, DutyRosterAssignmentDto } from '../api/duty-roster-assignments.service';
import { DUTY_ROSTER_SHIFTS, DutyRosterShift } from '../health-connect.models';
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
    // Window order, so a cell reads down the day — which is exactly the order DUTY_ROSTER_SHIFTS is
    // declared in: the three windowed values, then the windowless ones.
    //
    // This sorted on `shiftStartHour` with a hand-written tie-break naming FLEXIBLE, from when
    // FLEXIBLE was the only value with no window. `OFF` gave it a second, and both fall back to the
    // same default 07:00 — so the tie-break would have needed to name OFF too, and whatever came
    // after it. Reading the canonical order off the list the values themselves come from cannot fall
    // behind that list.
    day.shifts.sort((a, b) => DUTY_ROSTER_SHIFTS.indexOf(a) - DUTY_ROSTER_SHIFTS.indexOf(b));
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

/**
 * Index a year summary by ISO date (DR7).
 *
 * <p>Deliberately **not** {@link buildRosterDays}. The summary already arrives one record per day
 * with its absence resolved server-side — including the APPROVED-beats-REQUESTED rule and the
 * range-to-days expansion — so re-deriving any of that here would be a second implementation of the
 * same decision, free to drift from `DutyRosterService.summariseYear` and colour the same day
 * differently from the month view. This maps and nothing else.
 *
 * <p>Days with nothing on them are simply absent from the result, as the endpoint intends; the grid
 * renders a missing day as off, which is the same thing the page background says.
 */
export const indexDaySummaries = (summaries: readonly DaySummaryDto[]): Map<string, RosterDay> =>
  new Map(
    summaries
      .filter(summary => isIsoDate(summary.date))
      .map(summary => [summary.date, { date: summary.date, shifts: [...(summary.shifts ?? [])], absence: summary.absence ?? null }]),
  );
