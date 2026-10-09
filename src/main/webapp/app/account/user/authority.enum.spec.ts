import { Authority, CAREER_AUTHORITIES } from 'app/config/authority.constants';

import { USER_AUTHORITIES, UserAuthority } from './authority.enum';

/**
 * That step 1's role dropdown offers exactly the eight career authorities, and that it still does
 * after somebody edits `Authority`.
 *
 * <p>The guard `../../../../../docs/profile-addendum.md` § "Step 1's two dropdown sources" asks for,
 * and the sibling of `health-connect/authority-role.spec.ts`. It exists because `authority.enum.ts`
 * was a **seventh hand-written copy** of a documented cross-repo invariant with nothing holding it to
 * the other six, and had already drifted: its `ROLE_TECHNICIAN` member was keyed `TECHNICIAN`.
 *
 * <p><b>The expectation is derived, never listed.</b> Nothing below writes `8` and nothing below
 * names a discipline — a spec that listed the eight would be an eighth copy, and would pass while
 * agreeing with itself about a set that had moved. What is asserted is the relationship: whatever
 * `Authority` holds, the dropdown offers all of it except the two roles nobody applies for.
 *
 * <p><b>What this cannot see, stated so the next reader does not over-trust it.</b> The authorities
 * in `gateway/` and `api/`'s `AuthoritiesConstants.java` are not readable from Jest, so this holds
 * `web/`'s copy to `web/`'s enum and says nothing about the Java side. The gateway is what actually
 * grants a role, and `PUT /api/account` deliberately carries no authority field at all — so a drift
 * between this list and Java's costs an applicant a *choice*, not a privilege.
 */
describe('UserAuthority', () => {
  it('offers the career authorities and nothing else', () => {
    // The whole of the rule, in the form the addendum states it.
    expect([...USER_AUTHORITIES]).toEqual(Object.values(Authority).filter(a => a !== Authority.ADMIN && a !== Authority.USER));
  });

  it('has authorities to offer, so a derived expectation cannot assert nothing', () => {
    // Two empty lists agree, quietly and forever. `clinical-roles.spec.ts` and
    // `language.constants.spec.ts` both open with this guard for the same reason.
    expect(USER_AUTHORITIES.length).toBeGreaterThan(0);
  });

  it('never offers ROLE_ADMIN or ROLE_USER, whatever else the enum gains', () => {
    // Stated as its own case rather than left implicit in the equality above: these two are the
    // reason the list is a subtraction, and an applicant offered ROLE_ADMIN in a dropdown is the
    // failure that matters even if the equality were somehow satisfied.
    expect(USER_AUTHORITIES).not.toContain(Authority.ADMIN);
    expect(USER_AUTHORITIES).not.toContain(Authority.USER);
  });

  it('is the same list the careers handoff validates a ?track= against', () => {
    // One derivation, two importers. If these ever differ, the careers site can link to a role the
    // dropdown cannot show — graceful degradation hiding a real disagreement.
    expect(USER_AUTHORITIES).toBe(CAREER_AUTHORITIES);
  });

  it('keys every member by its own value, which is what the replaced enum got wrong', () => {
    // The original file keyed ROLE_TECHNICIAN as TECHNICIAN while the other seven carried the prefix,
    // so `UserAuthority.ROLE_TECHNICIAN` did not compile. Asserted at runtime because the cast in
    // `authority.enum.ts` is what makes the mapped type typecheck, and a cast proves nothing.
    // `String(value)` rather than a bare `value`: the key is a plain string and the value is typed as
    // the union, which `@typescript-eslint/no-unsafe-enum-comparison` refuses to compare directly.
    expect(Object.entries(UserAuthority).filter(([key, value]) => key !== String(value))).toEqual([]);
    expect(Object.keys(UserAuthority).sort()).toEqual([...USER_AUTHORITIES].sort());
  });
});
