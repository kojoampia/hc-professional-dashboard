/**
 * Earnings and roster REST contracts, served by **adminservice** (the hc-admin stack).
 *
 * Shifts and wage rates belong to hc-admin, so these are read across rather than mirrored here —
 * see `adminservice-earnings-contract.md`. Everything below is read-only by design: rates are the
 * administrator's to set, and a professional sees only what their own shifts came to.
 *
 * The shapes mirror `ProfessionalEarningsDTO`, `EarningsBucketDTO` and `ProfessionalShiftDTO` on
 * that side. `amount` fields arrive as JSON numbers from a Java `BigDecimal`.
 */

export type EarningsGranularity = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/** hc-admin's `ShiftType`. Note this is **not** the same enum as professionalservice's. */
export type AdminShiftType = 'DAY' | 'EVENING' | 'NIGHT' | 'OFF';

export interface EarningsBucketDto {
  /** ISO date. */
  periodStart: string;
  /** ISO date, clipped to the end of the window rather than the end of the calendar period. */
  periodEnd: string;
  shifts: number;
  amount: number;
}

export interface ProfessionalEarningsDto {
  professionalId: string;
  professionalName: string;
  /** hc-admin's `ProfessionalRole` — five values, unrelated to this app's nine authorities. */
  role: string;
  granularity: EarningsGranularity;
  /** ISO date. */
  from: string;
  /**
   * ISO date, and **not necessarily the `to` that was requested**. A shift is payable only once it
   * is in the past, so the server clips the window at yesterday and reports where it actually
   * ended. Label the chart from this, never from the requested range.
   */
  to: string;
  shiftsCompleted: number;
  totalAccrued: number;
  /**
   * Shifts that fell before any rate was configured for the role. They are counted in
   * `shiftsCompleted` and contribute nothing to `totalAccrued`, so a non-zero value here is the
   * difference between "earned nothing" and "nobody set a price" — the screen has to say which.
   */
  unpricedShifts: number;
  /** Null when nothing in the window was priced and the role has no current rate either. */
  currency: string | null;
  archived: boolean;
  buckets: EarningsBucketDto[];
}

export interface ProfessionalShiftDto {
  /** ISO date. */
  date: string;
  shift: AdminShiftType;
  /**
   * Whether this row counts toward earnings — worked, and not an off day. Server-supplied on
   * purpose: the rule is hc-admin's, and a client re-deriving it from its own "today" would
   * disagree across timezones on exactly the boundary that matters.
   */
  payable: boolean;
}

/** Query window for either endpoint. Both bounds are optional; the server picks sensible defaults. */
export interface EarningsQuery {
  granularity?: EarningsGranularity;
  /** ISO date. */
  from?: string;
  /** ISO date. */
  to?: string;
}
