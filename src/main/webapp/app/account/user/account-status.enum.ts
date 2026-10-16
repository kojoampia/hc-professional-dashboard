/**
 * The account lifecycle statuses the gateway declares — `AccountStatus.java`, `backlog.md` row 249.
 *
 * <p>⚠ **A runtime array with the union derived from it**, the shape `DUTY_ROSTER_SHIFTS` and
 * `USER_AUTHORITIES` take, and for their reason: a bare union cannot be enumerated at run time and
 * so cannot be asserted against anything. ⛔ **Not a TypeScript `enum`** — a bare `enum` is numeric,
 * so `AccountStatus.COMPLETED` would be `5` while the wire sends the string `"COMPLETED"`, and
 * every comparison would quietly be false.
 *
 * <p>⚠ **Nine values spanning two vocabularies, and the split is not cosmetic.** `STARTED`,
 * `PENDING` and `COMPLETED` describe onboarding; `ACTIVE`, `INACTIVE`, `SUSPENDED`, `CLOSED`,
 * `CANCELLED` and `ON_HOLD` are administrative. The gateway only ever writes `COMPLETED`, only from
 * the first group, and never backwards — see `UserService.applyStepOneStatus`, which is the single
 * place this field is written. Nothing in `web/` writes it at all: `PUT /api/account` reads five
 * values by name and the status is not one of them.
 *
 * <p>⭐ **Hand-mirrored from Java, like the eight authorities and the shift vocabulary before it.**
 * There is no generator across the gateway/web boundary, so `account-status.spec.ts` holds the
 * list's shape and this comment is the pointer to the file it mirrors.
 */
export const ACCOUNT_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'CLOSED',
  'PENDING',
  'COMPLETED',
  'STARTED',
  'CANCELLED',
  'ON_HOLD',
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/**
 * The one status onboarding reads — step 1's milestone, `profile.md` § "Step 1 — Complete the
 * account": *"Set `account.status` to `COMPLETED` when every required field is provided and saved."*
 */
export const ACCOUNT_STEP_COMPLETE: AccountStatus = 'COMPLETED';
