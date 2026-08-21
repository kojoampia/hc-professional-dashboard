import { AbsenceDto } from '../api/absence-api.service';
import { DutyRosterAssignmentDto } from '../api/duty-roster-assignments.service';
import { buildRosterDays, isPending, toneOf } from './roster-day.model';

/**
 * What colour a day is, which is the whole of DR5's product logic and the only part of it that can
 * be wrong without anything failing to build.
 */
describe('roster day model', () => {
  const dates = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21'];

  const assignment = (partial: Partial<DutyRosterAssignmentDto>): DutyRosterAssignmentDto => ({
    id: 'a-1',
    date: '2026-08-18',
    duty: 'NURSE',
    professionalId: 'prof-1',
    shift: 'DAY',
    name: 'Ward 3',
    ...partial,
  });

  const absence = (partial: Partial<AbsenceDto>): AbsenceDto => ({
    id: 'ab-1',
    fromDate: '2026-08-19',
    toDate: '2026-08-19',
    type: 'HOLIDAY',
    status: 'APPROVED',
    ...partial,
  });

  describe('buildRosterDays', () => {
    it('gives every requested date a day, including the empty ones', () => {
      const days = buildRosterDays(dates, [], []);
      expect([...days.keys()]).toEqual(dates);
      expect(days.get('2026-08-17')).toEqual({ date: '2026-08-17', shifts: [], absence: null });
    });

    it('collects several shifts onto one date in window order', () => {
      const days = buildRosterDays(
        dates,
        [assignment({ id: 'a-1', shift: 'NIGHT' }), assignment({ id: 'a-2', shift: 'DAY' }), assignment({ id: 'a-3', shift: 'EVENING' })],
        [],
      );
      expect(days.get('2026-08-18')!.shifts).toEqual(['DAY', 'EVENING', 'NIGHT']);
    });

    it('sorts FLEXIBLE last, since it spans the day rather than starting somewhere in it', () => {
      const days = buildRosterDays(dates, [assignment({ id: 'a-1', shift: 'FLEXIBLE' }), assignment({ id: 'a-2', shift: 'DAY' })], []);
      expect(days.get('2026-08-18')!.shifts).toEqual(['DAY', 'FLEXIBLE']);
    });

    it('ignores assignments outside the requested range rather than inventing days for them', () => {
      const days = buildRosterDays(dates, [assignment({ date: '2026-09-01' })], []);
      expect(days.size).toBe(dates.length);
      expect([...days.values()].every(day => day.shifts.length === 0)).toBe(true);
    });

    it('expands an absence range across every day it covers', () => {
      // The step that is easy to skip. Indexing by fromDate alone leaves the 20th and 21st blank
      // while looking like it worked, and a clinician on leave sees two ordinary working days.
      const days = buildRosterDays(dates, [], [absence({ fromDate: '2026-08-19', toDate: '2026-08-21' })]);
      expect(days.get('2026-08-18')!.absence).toBeNull();
      expect(days.get('2026-08-19')!.absence).toEqual({ type: 'HOLIDAY', status: 'APPROVED' });
      expect(days.get('2026-08-20')!.absence).toEqual({ type: 'HOLIDAY', status: 'APPROVED' });
      expect(days.get('2026-08-21')!.absence).toEqual({ type: 'HOLIDAY', status: 'APPROVED' });
    });

    it('clips an absence that starts before or ends after the range', () => {
      const days = buildRosterDays(dates, [], [absence({ fromDate: '2026-07-01', toDate: '2026-12-31' })]);
      expect([...days.values()].every(day => day.absence !== null)).toBe(true);
    });

    it('lets an APPROVED absence win a day it shares with a REQUESTED one', () => {
      // Mirrors DutyRosterService.summariseYear exactly. If the two disagree, the month grid and the
      // year view colour the same day differently and neither is obviously the wrong one.
      const days = buildRosterDays(
        dates,
        [],
        [
          absence({ id: 'ab-1', fromDate: '2026-08-19', toDate: '2026-08-19', type: 'SICK', status: 'REQUESTED' }),
          absence({ id: 'ab-2', fromDate: '2026-08-19', toDate: '2026-08-19', type: 'HOLIDAY', status: 'APPROVED' }),
        ],
      );
      expect(days.get('2026-08-19')!.absence).toEqual({ type: 'HOLIDAY', status: 'APPROVED' });
    });

    it('is insensitive to the order the two arrive in', () => {
      const days = buildRosterDays(
        dates,
        [],
        [
          absence({ id: 'ab-2', fromDate: '2026-08-19', toDate: '2026-08-19', type: 'HOLIDAY', status: 'APPROVED' }),
          absence({ id: 'ab-1', fromDate: '2026-08-19', toDate: '2026-08-19', type: 'SICK', status: 'REQUESTED' }),
        ],
      );
      expect(days.get('2026-08-19')!.absence).toEqual({ type: 'HOLIDAY', status: 'APPROVED' });
    });

    it('drops an absence with a malformed date instead of colouring the whole range', () => {
      // A `null` or empty fromDate compares as less than every ISO string, so an unguarded range
      // check would paint every day in the grid.
      const days = buildRosterDays(dates, [], [absence({ fromDate: '' as string, toDate: '2026-08-19' })]);
      expect([...days.values()].every(day => day.absence === null)).toBe(true);
    });
  });

  describe('toneOf', () => {
    it('is off for a day with nothing on it', () => {
      expect(toneOf({ date: '2026-08-17', shifts: [], absence: null })).toBe('off');
    });

    it('is working for a day with a shift', () => {
      expect(toneOf({ date: '2026-08-17', shifts: ['DAY'], absence: null })).toBe('working');
    });

    it('maps each absence type to its own tone', () => {
      expect(toneOf({ date: '2026-08-17', shifts: [], absence: { type: 'HOLIDAY', status: 'APPROVED' } })).toBe('holiday');
      expect(toneOf({ date: '2026-08-17', shifts: [], absence: { type: 'SICK', status: 'APPROVED' } })).toBe('sick');
      expect(toneOf({ date: '2026-08-17', shifts: [], absence: { type: 'OTHER', status: 'APPROVED' } })).toBe('other');
    });

    it('lets absence win over work, so a conflict is visible rather than hidden', () => {
      // A day with both is leave over a shift nobody has reassigned — exactly what DR4's 409 refuses
      // to approve. Colouring it as ordinary work would hide the one day an administrator must see.
      expect(toneOf({ date: '2026-08-17', shifts: ['DAY'], absence: { type: 'HOLIDAY', status: 'REQUESTED' } })).toBe('holiday');
    });
  });

  describe('isPending', () => {
    it('is true only for a requested absence', () => {
      expect(isPending({ date: '2026-08-17', shifts: [], absence: { type: 'HOLIDAY', status: 'REQUESTED' } })).toBe(true);
      expect(isPending({ date: '2026-08-17', shifts: [], absence: { type: 'HOLIDAY', status: 'APPROVED' } })).toBe(false);
      expect(isPending({ date: '2026-08-17', shifts: ['DAY'], absence: null })).toBe(false);
    });
  });
});
