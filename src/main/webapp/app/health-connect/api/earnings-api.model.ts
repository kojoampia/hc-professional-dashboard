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

import { DutyRosterShift } from '../health-connect.models';

export type EarningsGranularity = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/**
 * hc-admin's `ShiftType`, which **is** professionalservice's as of 2026-09-04.
 *
 * <p>This was `'DAY' | 'EVENING' | 'NIGHT' | 'OFF'` written out here on purpose: the two enums
 * differed by one value at each end, and a separate type was how that divergence was recorded where
 * somebody reading the earnings contract would meet it. The superset change settled both sides on
 * `DAY, EVENING, NIGHT, OFF, FLEXIBLE`, so the type existed only to describe a difference that no
 * longer exists — and a second union that happens to agree today is precisely the near-identity this
 * change was made to remove.
 *
 * <p>Kept as an alias rather than deleted outright, because these shapes are read as hc-admin's
 * contract and naming the enum at the boundary says which service owns it. If the two ever diverge
 * again this alias is where it becomes a real union once more — which makes the divergence something
 * somebody has to write down, rather than something that accumulates.
 */
export type AdminShiftType = DutyRosterShift;

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
