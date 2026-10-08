import { CAREER_AUTHORITIES, CareerAuthority } from 'app/config/authority.constants';

/**
 * The career roles onboarding step 1 may offer: the eight disciplines, never `ROLE_ADMIN` and never
 * `ROLE_USER`.
 *
 * <p><b>Derived from {@link CAREER_AUTHORITIES}, which is derived from `Authority`.</b> This file
 * began as a hand-written `enum UserAuthority` listing all eight — the *seventh* copy of a documented
 * cross-repo invariant, with no test holding it to any of the other six — and it had already drifted
 * before it was imported anywhere: its last member's key read `TECHNICIAN` while every other key
 * carried the `ROLE_` prefix, so `UserAuthority.ROLE_TECHNICIAN` did not compile and
 * `UserAuthority.TECHNICIAN` did. The values were all correct, so nothing a reader could see was
 * wrong; the trap was laid for whichever screen imported it first.
 *
 * <p><b>That defect is what a derivation removes rather than fixes.</b> Each key here *is* its value,
 * built by mapping the list onto itself, so a key cannot disagree with a value and a ninth discipline
 * added to `Authority` arrives here with nobody editing this file. Correcting the typo by hand would
 * have left the next drift free to happen.
 *
 * <p>Shaped to stand in for the enum it replaces, so `UserAuthority` still reads as both a type and a
 * value — `UserAuthority.ROLE_NURSE` for a member, `UserAuthority` for the union of the eight. It is
 * the same idiom `health-connect.models.ts` uses for `DUTY_ROSTER_SHIFTS`: a runtime array with the
 * union derived from it, because **a bare union cannot be enumerated at runtime and so cannot be
 * asserted against anything**, which is exactly how this file's own typo survived.
 *
 * <p>Iterate {@link USER_AUTHORITIES} to build a dropdown — step 1's role picker is T8's, and this is
 * one of the two sources T4 provides it. The other is `LANGUAGES` plus the existing
 * `findLanguageFromKey` pipe; neither needs a new translation key.
 *
 * @see authority.enum.spec.ts, which holds these values to `Authority` itself
 */
export type UserAuthority = CareerAuthority;

/** The eight, in `Authority`'s own declaration order, for a dropdown to iterate. */
export const USER_AUTHORITIES: readonly UserAuthority[] = CAREER_AUTHORITIES;

/**
 * Member access in the shape the replaced enum offered: `UserAuthority.ROLE_DOCTOR`.
 *
 * <p>Every key equals its value by construction. The cast is unavoidable — `Object.fromEntries`
 * returns an index signature and cannot know the keys cover the union — and it is sound here only
 * because the entries come from {@link USER_AUTHORITIES} itself. `authority.enum.spec.ts` asserts the
 * key/value identity rather than leaving the cast to be trusted.
 */
export const UserAuthority: { readonly [K in UserAuthority]: K } = Object.fromEntries(
  USER_AUTHORITIES.map(authority => [authority, authority]),
) as { readonly [K in UserAuthority]: K };
