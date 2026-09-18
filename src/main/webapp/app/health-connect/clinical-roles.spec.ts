import { Authority } from 'app/config/authority.constants';

import { CLINICAL_ROLES, NON_CLINICAL_ROLES } from './authority-role';
import { AuthorityRole } from './health-connect.models';

/**
 * That "the clinical disciplines" is a list this repo can count, that every authority it knows is
 * classified as one or not one, and that the two enums declaring them agree.
 *
 * <p>This is the guard `../../../docs/backlog.md` item 149 asks for. The sign-in page advertised
 * **nine** clinical roles for nine days after `ROLE_ANGEL` stopped being one (item 44), because the
 * count was a literal in four translation catalogues and nothing in this repo relates a catalogue
 * value to an enum's cardinality. All three i18n gates pass over it by construction — parity because
 * the key exists in every locale, `untranslated-literals` because it is translated, `brand-terms`
 * because a digit is not a denied term.
 *
 * <p><b>The expectations here are derived, never listed</b> — the house pattern from
 * `shift-names.spec.ts`, for the same reason: a check that names its own coverage stops covering
 * things. Nothing below writes `8`.
 *
 * <p><b>What the partition is for, and why it is not a subtraction.</b> Item 149 was filed
 * prescribing `Object.keys(AuthorityRole).length - 1`, which yields nine — the enum carries ten
 * members, and the arithmetic missed `USER`. Every subtraction rule has that failure mode
 * permanently: the next non-discipline member makes it silently wrong. Asserting instead that
 * {@link CLINICAL_ROLES} and {@link NON_CLINICAL_ROLES} cover {@link AuthorityRole} exactly once
 * each means a new member fails this spec until somebody classifies it, and the failure names the
 * member.
 *
 * <p><b>Why {@link Authority} is here too.</b> `web/` declares the authorities twice — this enum of
 * display names, and `config/authority.constants.ts`'s enum of `ROLE_*` strings — and the advertised
 * count derives from only one of them. A discipline added to `Authority` alone would leave the
 * partition above complete, the count unchanged, and the sign-in page wrong again, which is item
 * 149's defect reached by a route the partition cannot see. Comparing member *names* is what closes
 * it. The estate's other three copies are Java and `mobile/`; nothing here can read them, and
 * `docs/CLAUDE.md` names that as a standing cross-repo cost.
 *
 * @see shift-names.spec.ts, the same shape of check for `ShiftType`
 * @see auth-shell.component.spec.ts, which holds the rendered numeral to this list
 */
describe('clinical roles', () => {
  it('has roles to count, so a derived expectation cannot assert nothing', () => {
    // An empty list would make every count below trivially agree, quietly and forever.
    expect(CLINICAL_ROLES.length).toBeGreaterThan(0);
  });

  it('classifies every authority this portal knows as a discipline or not one', () => {
    // Named rather than counted, so the failure says which member somebody has to think about.
    const classified = [...CLINICAL_ROLES, ...NON_CLINICAL_ROLES];
    expect(Object.values(AuthorityRole).filter(role => !classified.includes(role))).toEqual([]);
  });

  it('classifies none of them twice, and invents none the enum does not declare', () => {
    const declared = Object.values(AuthorityRole);
    const classified = [...CLINICAL_ROLES, ...NON_CLINICAL_ROLES];
    expect(classified.filter(role => !declared.includes(role))).toEqual([]);
    expect(classified.filter((role, index) => classified.indexOf(role) !== index)).toEqual([]);
  });

  it('treats neither the administrator nor the base role as a discipline', () => {
    // The one classification worth pinning by name: `hasClinicalAuthority` is true for ADMIN, and
    // borrowing it to mean "is one of the disciplines" is how this count would go wrong by one.
    expect(CLINICAL_ROLES).not.toContain(AuthorityRole.ADMIN);
    expect(CLINICAL_ROLES).not.toContain(AuthorityRole.USER);
  });

  it('declares the same authorities as the ROLE_* enum, which the count does not read', () => {
    // Sets, not sequences: the two enums list ADMIN and USER at opposite ends and always have.
    expect([...Object.keys(AuthorityRole)].sort()).toEqual([...Object.keys(Authority)].sort());
  });
});
