import { OnboardingProfileDto } from 'app/health-connect/api/onboarding-api.service';

import { SEXES, Sex } from './sex.enum';

/**
 * That `Profile.sex` offers exactly the two members `profile.md` names, and that the member-access
 * object cannot disagree with the list it is built from (F9).
 *
 * <p>The sibling of `app/account/user/authority.enum.spec.ts`, and it exists for the same reason
 * that one does: **a `const`-asserted array with a derived union is only as good as something that
 * enumerates it at runtime.** `authority.enum.ts` shipped with a member keyed `TECHNICIAN` while
 * every other key carried the `ROLE_` prefix, so `UserAuthority.ROLE_TECHNICIAN` did not compile and
 * nothing a reader could see was wrong. A cast proves nothing; this does.
 *
 * <p>⚠ **What this cannot see.** `net.jojoaddison.domain.enumeration.Sex` is not readable from Jest,
 * so this holds `web/`'s file to `profile.md` and says nothing about the Java enum. The link across
 * is made by hand — as it is for the four shift vocabularies — and a drift costs a clinician a 400
 * on save rather than a wrong value in the database, because the server refuses anything outside its
 * own enumeration.
 */
describe('Sex', () => {
  /**
   * ⛔ The one case here that is **listed rather than derived**, and deliberately so.
   *
   * <p>Everywhere else in this repository a derived expectation is preferred, because a listed one is
   * a second copy. Here the list *is* the requirement: `profile.md` writes
   * `sex.enum.ts - {'FEMALE','MALE'}`, so there is no other source to derive from and the only thing
   * a spec can usefully do is restate the specification and fail if the file drifts from it. A
   * derived version of this case would compare the file with itself.
   */
  it('offers exactly FEMALE and MALE, in that order', () => {
    expect([...SEXES]).toEqual(['FEMALE', 'MALE']);
  });

  it('has members to offer, so the cases below cannot assert nothing', () => {
    // Two empty lists agree, quietly and forever — the guard `authority.enum.spec.ts` and
    // `language.constants.spec.ts` both open with.
    expect(SEXES.length).toBeGreaterThan(0);
  });

  it('keys every member by its own value, which is what `authority.enum.ts` got wrong', () => {
    // `String(value)` rather than a bare `value`: the key is a plain string and the value is typed as
    // the union, which `@typescript-eslint/no-unsafe-enum-comparison` refuses to compare directly.
    expect(Object.entries(Sex).filter(([key, value]) => key !== String(value))).toEqual([]);
    expect(Object.keys(Sex).sort()).toEqual([...SEXES].sort());
  });

  it('exposes member access in the shape an enum would have', () => {
    expect(Sex.FEMALE).toBe('FEMALE');
    expect(Sex.MALE).toBe('MALE');
  });

  /**
   * That the wire type is typed by this file rather than by `string`.
   *
   * <p>Asserted by assignment rather than by a type-level trick, because that is what a reader can
   * check: the member assigns, and the line below it is the one that would have compiled before F9.
   * `npx ng build` is what actually enforces it — `tsc` alone does not type-check a file no route
   * reaches, which is exactly how an unrouted `entities/` tree hides errors.
   */
  it('types OnboardingProfileDto.sex', () => {
    const profile: OnboardingProfileDto = { sex: Sex.FEMALE };
    expect(profile.sex).toBe('FEMALE');

    // @ts-expect-error a value outside the enumeration is no longer assignable — this was `string`.
    const invalid: OnboardingProfileDto = { sex: 'banana' };
    expect(invalid.sex).toBe('banana');
  });
});
