import { ACCOUNT_STATUSES, ACCOUNT_STEP_COMPLETE, AccountStatus } from './account-status.enum';

/**
 * `backlog.md` row 249. The gateway's `AccountStatus.java` is mirrored here by hand — there is no
 * generator across that boundary — so this spec holds the properties a hand-mirrored list can lose.
 *
 * <p>⚠ **It cannot read the Java**, and saying so is the point: these cases catch a list that has
 * drifted into something structurally wrong, not a list that has drifted away from the gateway. The
 * guard against the second is the pointer in `account-status.enum.ts` and a gateway-side change
 * arriving with its own `web/` clause — the same arrangement the eight authorities and the shift
 * vocabulary live under.
 */
describe('AccountStatus', () => {
  it('should be strings, because the wire sends strings', () => {
    // ⛔ The trap this exists for: `enum AccountStatus { ACTIVE, … }` is NUMERIC, so COMPLETED
    // would be 5 while the server sends "COMPLETED", and every comparison would be quietly false.
    for (const status of ACCOUNT_STATUSES) {
      expect(typeof status).toBe('string');
      expect(status).toBe(status.toUpperCase());
    }
  });

  it('should hold the nine the gateway declares, with no duplicates', () => {
    expect(ACCOUNT_STATUSES).toHaveLength(9);
    expect(new Set(ACCOUNT_STATUSES).size).toBe(ACCOUNT_STATUSES.length);
  });

  /**
   * ⚠ The onboarding half and the administrative half are different vocabularies in one enum, and
   * `UserService.applyStepOneStatus` only ever moves an account out of the first. Named here so a
   * reader of this file meets the distinction the gateway's guard depends on.
   */
  it('should carry both the onboarding and the administrative vocabularies', () => {
    const onboarding: AccountStatus[] = ['STARTED', 'PENDING', 'COMPLETED'];
    const administrative: AccountStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED', 'CANCELLED', 'ON_HOLD'];

    expect(ACCOUNT_STATUSES).toEqual(expect.arrayContaining([...onboarding, ...administrative]));
    expect(onboarding.length + administrative.length).toBe(ACCOUNT_STATUSES.length);
  });

  it('should name step 1 completion with a member of the list', () => {
    expect(ACCOUNT_STATUSES).toContain(ACCOUNT_STEP_COMPLETE);
    expect(ACCOUNT_STEP_COMPLETE).toBe('COMPLETED');
  });
});
