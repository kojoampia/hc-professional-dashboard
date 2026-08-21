import { addDays, addMonths, isoDayOfWeek, startOfIsoWeek, todayIsoDate } from './calendar-date.util';
import { isoWeekDays, isoWeekOf, isoWeeksInYear, startOfIsoWeekNumber } from './week-number.util';

/**
 * The date-grid edge cases § 9 says are ours to get right, because we chose to hand-write the
 * calendar rather than take a dependency: DST, week 53, month boundaries, and the year-boundary week.
 * Each of those is a case here, and each of them is wrong under an implementation that looks correct.
 */
describe('calendar date utilities', () => {
  describe('day arithmetic is UTC, so daylight saving cannot move a date', () => {
    it('advances across a spring-forward transition by exactly one day', () => {
      // 30 March 2026 is the EU spring-forward. In a local-midnight implementation the 29th + 1 day
      // is 23 hours later, which still lands on the 29th in some zones — a duplicated grid cell.
      expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
      expect(addDays('2026-03-30', -1)).toBe('2026-03-29');
    });

    it('advances across an autumn-back transition by exactly one day', () => {
      expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    });

    it('crosses month and year boundaries', () => {
      expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    });

    it('handles the leap day', () => {
      expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
      expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
      // 2026 is not a leap year, so the same step skips the 29th entirely.
      expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    });
  });

  describe('month arithmetic clamps rather than rolling forward', () => {
    it('does not skip a month when the day does not exist in the target', () => {
      // The bug this prevents: setMonth on the 31st rolls into the month after next, so paging
      // forward from 31 March lands in May and April never renders.
      expect(addMonths('2026-03-31', 1)).toBe('2026-04-30');
      expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
      expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    });

    it('moves backwards and across years', () => {
      expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
      expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    });
  });

  describe('isoDayOfWeek puts Monday at 1 and Sunday at 7', () => {
    it('numbers a full week', () => {
      // Sunday is 7, not 0 — using getUTCDay() unconverted shifts a whole month grid by a column.
      expect(isoDayOfWeek('2026-08-17')).toBe(1);
      expect(isoDayOfWeek('2026-08-23')).toBe(DAYS_IN_WEEK_EXPECTED);
    });

    it('startOfIsoWeek returns the Monday, and is idempotent on a Monday', () => {
      expect(startOfIsoWeek('2026-08-23')).toBe('2026-08-17');
      expect(startOfIsoWeek('2026-08-17')).toBe('2026-08-17');
    });
  });

  describe('ISO week numbering', () => {
    it('numbers an ordinary mid-year week', () => {
      expect(isoWeekOf('2026-08-21')).toEqual({ week: 34, weekYear: 2026 });
    });

    it('puts late December into week 1 of the following year', () => {
      // The year-boundary case, and the reason weekYear exists. 29 December 2025 is a Monday whose
      // week contains 1 January 2026, so it is week 1 of 2026 — pairing this week number with
      // getFullYear() would file it under 2025, whose week 1 it is not in.
      expect(isoWeekOf('2025-12-29')).toEqual({ week: 1, weekYear: 2026 });
      expect(isoWeekOf('2026-01-01')).toEqual({ week: 1, weekYear: 2026 });
    });

    it('puts early January into the last week of the previous year', () => {
      // The mirror image: 1 January 2027 is a Friday, so its week began on 28 December 2026.
      expect(isoWeekOf('2027-01-01')).toEqual({ week: 53, weekYear: 2026 });
      expect(isoWeekOf('2027-01-03')).toEqual({ week: 53, weekYear: 2026 });
      expect(isoWeekOf('2027-01-04')).toEqual({ week: 1, weekYear: 2027 });
    });

    it('never returns week 0', () => {
      // fix.md asked for [0-52]. There is no week 0 in ISO, and the first days of a year are the
      // case that would produce one under a naive "days since 1 January divided by 7".
      for (const year of [2024, 2025, 2026, 2027, 2028]) {
        for (let day = 1; day <= 7; day++) {
          expect(isoWeekOf(`${year}-01-0${day}`).week).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('reports 53 weeks only for the years that have them', () => {
      // A year has 53 ISO weeks when it starts on a Thursday, or is a leap year starting on a
      // Wednesday. 2026 starts on a Thursday; 2032 is a leap year starting on a Thursday.
      expect(isoWeeksInYear(2026)).toBe(53);
      expect(isoWeeksInYear(2032)).toBe(53);
      expect(isoWeeksInYear(2025)).toBe(52);
      expect(isoWeeksInYear(2027)).toBe(52);
      expect(isoWeeksInYear(2028)).toBe(52);
    });

    it('only ever reports 52 or 53', () => {
      for (let year = 2000; year <= 2060; year++) {
        expect([52, 53]).toContain(isoWeeksInYear(year));
      }
    });
  });

  describe('startOfIsoWeekNumber is the inverse of isoWeekOf', () => {
    it('round-trips every week of a 53-week year and a 52-week year', () => {
      for (const year of [2026, 2027]) {
        for (let week = 1; week <= isoWeeksInYear(year); week++) {
          const monday = startOfIsoWeekNumber(year, week);
          expect(isoDayOfWeek(monday)).toBe(1);
          expect(isoWeekOf(monday)).toEqual({ week, weekYear: year });
        }
      }
    });

    it('continues past the end of a year rather than clamping', () => {
      // Week 53 of a 52-week year is week 1 of the next. Clamping here would make "next week" from
      // the last week of December do nothing, which reads as a broken button.
      expect(startOfIsoWeekNumber(2027, 53)).toBe(startOfIsoWeekNumber(2028, 1));
    });
  });

  describe('isoWeekDays', () => {
    it('returns seven consecutive days starting on Monday', () => {
      expect(isoWeekDays('2026-08-21')).toEqual([
        '2026-08-17',
        '2026-08-18',
        '2026-08-19',
        '2026-08-20',
        '2026-08-21',
        '2026-08-22',
        '2026-08-23',
      ]);
    });

    it('spans a year boundary without a gap', () => {
      expect(isoWeekDays('2026-01-01')).toEqual([
        '2025-12-29',
        '2025-12-30',
        '2025-12-31',
        '2026-01-01',
        '2026-01-02',
        '2026-01-03',
        '2026-01-04',
      ]);
    });
  });

  describe('todayIsoDate', () => {
    it('reads the local calendar day, not the UTC one', () => {
      // The one place local time is the right question: "is this cell today" is asked from where the
      // clinician is standing. Late-evening local time is already tomorrow in UTC.
      expect(todayIsoDate(new Date(2026, 7, 21, 23, 30))).toBe('2026-08-21');
      expect(todayIsoDate(new Date(2026, 7, 21, 0, 15))).toBe('2026-08-21');
    });
  });
});

const DAYS_IN_WEEK_EXPECTED = 7;
