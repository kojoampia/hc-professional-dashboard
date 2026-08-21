import { DAYS_IN_WEEK, addDays, isoDayOfWeek, startOfIsoWeek, toIsoDate, toUtcDate, yearOf } from './calendar-date.util';

/**
 * ISO-8601 week numbering (docs/duty-roster.md § 10, DR5).
 *
 * <p><b>Weeks run 1–53 and there is no week 0.</b> `fix.md` asked for `[0-52]`; ISO wins, which also
 * agrees with its own Monday-to-Sunday row ordering. Week 1 is the week containing the year's first
 * Thursday — equivalently, the week containing 4 January, which is the form implemented here because
 * it needs no search.
 *
 * <p><b>A week can belong to a different year than its days do</b>, and that is the part worth
 * stating rather than discovering. 29 December 2025 is a Monday whose week contains 1 January 2026,
 * so it is week 1 **of 2026** — its `weekYear` is 2026 while its calendar year is 2025. The reverse
 * happens too: 1 January 2027 is a Friday belonging to week 53 of 2026. Any caller that pairs a week
 * number with a year must use {@link IsoWeek.weekYear} and never `getFullYear()`, or the last days of
 * December file themselves under a year whose week 1 they are not in.
 *
 * <p>Note this is the *numbering* rule only. Whether the year view draws the 29 Dec – 4 Jan week under
 * the old year or the new one is a display choice that ISO does not make for us; it is open question 1
 * in `duty-roster.md` and belongs to DR7, which is the package that renders a year.
 */
export interface IsoWeek {
  /** 1–53. */
  week: number;
  /** The year this week belongs to, which is not always the calendar year of its days. */
  weekYear: number;
}

/** 4 January is in week 1 by definition, in every year. */
const WEEK_1_ANCHOR_DAY = 4;

/**
 * The Monday of week 1 of the given ISO week year.
 *
 * <p>Derived from 4 January rather than by hunting for the first Thursday: the two definitions are
 * equivalent, and this one is a single subtraction with nothing to get wrong in a loop.
 */
const startOfIsoWeekYear = (weekYear: number): string => startOfIsoWeek(`${weekYear}-01-${String(WEEK_1_ANCHOR_DAY).padStart(2, '0')}`);

/**
 * The ISO week number and week year of an ISO day.
 *
 * <p>Works by moving to the Thursday of the day's own week and reading *that* day's calendar year —
 * the Thursday is the day ISO uses to decide which year a week belongs to, because it is the only
 * weekday that cannot fall on the wrong side of a year boundary from the majority of its week.
 */
export const isoWeekOf = (isoDate: string): IsoWeek => {
  const thursday = addDays(isoDate, WEEK_1_ANCHOR_DAY - isoDayOfWeek(isoDate));
  const weekYear = yearOf(thursday);
  const firstMonday = startOfIsoWeekYear(weekYear);
  const elapsedDays = Math.round((toUtcDate(thursday).getTime() - toUtcDate(firstMonday).getTime()) / 86_400_000);
  return { week: Math.floor(elapsedDays / DAYS_IN_WEEK) + 1, weekYear };
};

/**
 * How many ISO weeks a week year holds — **52 or 53, never anything else**.
 *
 * <p>A year has 53 when it starts on a Thursday, or is a leap year starting on a Wednesday. Rather
 * than encode that rule, this asks what week 28 December falls in: that date is in the last week of
 * its year under every arrangement, so the answer needs no special cases.
 */
export const isoWeeksInYear = (weekYear: number): number => isoWeekOf(`${weekYear}-12-28`).week;

/**
 * The Monday of a given ISO week — the inverse of {@link isoWeekOf}, and what week navigation moves
 * between.
 *
 * <p>Out-of-range week numbers are **not clamped**: asking for week 53 of a 52-week year returns the
 * Monday of week 1 of the next year, which is the honest continuation rather than a silent stop at a
 * boundary the user is trying to cross.
 */
export const startOfIsoWeekNumber = (weekYear: number, week: number): string =>
  addDays(startOfIsoWeekYear(weekYear), (week - 1) * DAYS_IN_WEEK);

/** The seven ISO days of the week containing `isoDate`, Monday first. */
export const isoWeekDays = (isoDate: string): string[] => {
  const monday = startOfIsoWeek(isoDate);
  return Array.from({ length: DAYS_IN_WEEK }, (_unused, index) => addDays(monday, index));
};

/** Re-exported so the grids need only one import for "give me the days of this week". */
export { toIsoDate };
