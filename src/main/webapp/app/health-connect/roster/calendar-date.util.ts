/**
 * Date arithmetic for the roster calendar (docs/duty-roster.md § 9, DR5).
 *
 * <p><b>Everything here is an ISO `YYYY-MM-DD` string in, ISO string out, and every calculation
 * happens in UTC.</b> That is deliberate and it is the whole reason this file exists rather than the
 * grids calling `new Date(...)` themselves.
 *
 * <p>The roster speaks in dates without times — a shift belongs to a date, and `DutyRoster.date` is
 * an ISO day. Reconstituting one as a local `Date` puts it at local midnight, and local midnight is
 * exactly where daylight saving bites: in a zone that springs forward at 00:00 there is no such
 * instant, so the date silently becomes the previous day, and `setDate(d.getDate() + 1)` across a
 * transition can advance by 23 or 25 hours and land back on the day it started. A month grid built
 * that way renders a duplicated or missing cell twice a year, in some zones only, which is not a bug
 * anyone finds by looking. Doing the arithmetic in UTC removes the transition entirely; the values
 * are calendar days, never instants, so no zone is ever the right one to interpret them in.
 *
 * <p>Ghana is UTC+0 and observes no DST, so none of this can fail where the service runs today. It
 * fails for a clinician in Europe, and it is cheaper to be right now than to explain later.
 */

/** Days per week, named because a bare 7 in an index calculation reads as a magic number. */
export const DAYS_IN_WEEK = 7;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value: number): string => String(value).padStart(2, '0');

/** True for a well-formed `YYYY-MM-DD`. Does not check that the day exists in the month. */
export const isIsoDate = (value: string | null | undefined): value is string => typeof value === 'string' && ISO_DATE.test(value);

/**
 * An ISO day as a UTC instant at midnight — the internal representation, never rendered.
 *
 * <p>Returns `NaN`-bearing dates for malformed input rather than throwing, so a bad value from the
 * wire degrades to an empty cell instead of taking the page down.
 */
export const toUtcDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);

/** The inverse of {@link toUtcDate}. */
export const toIsoDate = (date: Date): string => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

/** `isoDate` shifted by whole days. Negative moves back. */
export const addDays = (isoDate: string, days: number): string => {
  const date = toUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
};

/** `isoDate` shifted by whole months, clamped to the target month's last day (31 Jan + 1 → 28 Feb). */
export const addMonths = (isoDate: string, months: number): string => {
  const date = toUtcDate(isoDate);
  const day = date.getUTCDate();
  // Move on the 1st, then re-apply the day clamped — setUTCMonth on the 31st would otherwise roll
  // forward into the next month, so "next month" from 31 March would land in May and skip April.
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = daysInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  date.setUTCDate(Math.min(day, lastDay));
  return toIsoDate(date);
};

/** Number of days in a 1-indexed month. */
export const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * Day of the week with **Monday as 1 and Sunday as 7**, which is what ISO-8601 uses and what the
 * grids lay out. JavaScript's own `getUTCDay()` puts Sunday at 0, and using it unconverted is the
 * classic off-by-one that shifts an entire month grid by a column.
 */
export const isoDayOfWeek = (isoDate: string): number => toUtcDate(isoDate).getUTCDay() || DAYS_IN_WEEK;

/** The Monday of the week containing `isoDate`. */
export const startOfIsoWeek = (isoDate: string): string => addDays(isoDate, 1 - isoDayOfWeek(isoDate));

/** The first day of the month containing `isoDate`. */
export const startOfMonth = (isoDate: string): string => `${isoDate.slice(0, 7)}-01`;

/** Today, as an ISO day in the viewer's own zone — the one place local time is the right question. */
export const todayIsoDate = (now: Date = new Date()): string => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/** 1-indexed month of an ISO day, without constructing a Date. */
export const monthOf = (isoDate: string): number => Number(isoDate.slice(5, 7));

/** Calendar year of an ISO day. Not the ISO *week* year — see `week-number.util`. */
export const yearOf = (isoDate: string): number => Number(isoDate.slice(0, 4));
