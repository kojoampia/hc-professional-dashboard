import { AuthorityRole } from './health-connect.models';

export type HealthConnectPermission = 'managePatient' | 'manageCase' | 'manageActivity' | 'manageReport' | 'manageDutyRoster';

const ROLE_AUTHORITIES: Readonly<Record<AuthorityRole, string>> = {
  [AuthorityRole.ADMIN]: 'ROLE_ADMIN',
  [AuthorityRole.DOCTOR]: 'ROLE_DOCTOR',
  [AuthorityRole.NURSE]: 'ROLE_NURSE',
  [AuthorityRole.PARAMEDIC]: 'ROLE_PARAMEDIC',
  [AuthorityRole.PHARMACIST]: 'ROLE_PHARMACIST',
  [AuthorityRole.THERAPIST]: 'ROLE_THERAPIST',
  [AuthorityRole.CARER]: 'ROLE_CARER',
  [AuthorityRole.CHEMIST]: 'ROLE_CHEMIST',
  [AuthorityRole.TECHNICIAN]: 'ROLE_TECHNICIAN',
  [AuthorityRole.USER]: 'ROLE_USER',
};

const ROLE_PRECEDENCE: readonly AuthorityRole[] = [
  AuthorityRole.ADMIN,
  AuthorityRole.DOCTOR,
  AuthorityRole.NURSE,
  AuthorityRole.PARAMEDIC,
  AuthorityRole.PHARMACIST,
  AuthorityRole.THERAPIST,
  AuthorityRole.CARER,
  AuthorityRole.CHEMIST,
  AuthorityRole.TECHNICIAN,
  AuthorityRole.USER,
];

/**
 * The clinical disciplines this portal recognises — the eight, and the answer to "how many clinical
 * roles are there".
 *
 * <p><b>This exists because that number was written down and went stale.</b> The sign-in page
 * advertised nine clinical roles for nine days after `ROLE_ANGEL` stopped being one of them
 * (`../../../docs/backlog.md` items 44 and 149). The count lived as a literal `"9"` in four
 * translation catalogues, and no gate in this repo could see it: key parity passed because the key
 * existed everywhere, `untranslated-literals.spec.ts` passed because it *was* translated, and
 * `brand-terms.spec.ts` passed because a digit is not a denied term. Nothing related a catalogue
 * value to an enum's cardinality.
 *
 * <p><b>Why a list and not a subtraction.</b> The obvious derivation is arithmetic over
 * {@link AuthorityRole} — and item 149 was originally filed prescribing exactly that,
 * `Object.keys(AuthorityRole).length - 1`, which yields <b>9</b>: the enum holds ten members, the
 * eight disciplines plus `ADMIN` plus `USER`, and the subtraction forgot one. It would have
 * reproduced the very number it was meant to remove, wearing the authority of a derived constant.
 * Any subtraction has that failure mode permanently, because the next non-discipline member added to
 * the enum makes the arithmetic silently wrong again. An explicit list cannot drift that way: it can
 * only be incomplete, and {@link NON_CLINICAL_ROLES} plus `clinical-roles.spec.ts` is what makes
 * incompleteness fail loudly.
 *
 * <p>Ordered as {@link ROLE_PRECEDENCE} orders them, minus the two that are not disciplines.
 *
 * @see NON_CLINICAL_ROLES, the other half of the partition
 * @see clinical-roles.spec.ts, which fails when this list moves
 */
export const CLINICAL_ROLES: readonly AuthorityRole[] = [
  AuthorityRole.DOCTOR,
  AuthorityRole.NURSE,
  AuthorityRole.PARAMEDIC,
  AuthorityRole.PHARMACIST,
  AuthorityRole.THERAPIST,
  AuthorityRole.CARER,
  AuthorityRole.CHEMIST,
  AuthorityRole.TECHNICIAN,
];

/**
 * The members of {@link AuthorityRole} that are <b>not</b> clinical disciplines.
 *
 * <p><b>This is not a list anybody needs to read — it is the half that makes the other half
 * checkable.</b> Deriving it as "everything not in {@link CLINICAL_ROLES}" would compile, read
 * better, and silently absorb the next authority somebody adds: a new discipline would land here by
 * default and the advertised count would be wrong again, which is this row's own defect recurring
 * through its own fix. Written out, the two together must cover {@link AuthorityRole} exactly once
 * each, so adding any member to that enum fails `clinical-roles.spec.ts` until a human says which
 * kind of thing it is.
 *
 * <p>`ADMIN` is here rather than beside the disciplines deliberately, and it is the distinction
 * {@link hasClinicalAuthority} does <em>not</em> draw: that predicate is true for an administrator,
 * because it asks "does somebody work here and need the portal around them". "Is one of the eight
 * disciplines" is a different question, and using either to answer the other is wrong in one
 * direction each.
 */
export const NON_CLINICAL_ROLES: readonly AuthorityRole[] = [AuthorityRole.ADMIN, AuthorityRole.USER];

// Carer, Chemist, and Technician are read-only in v1 — keep this aligned
// with the api's AuthoritiesConstants.CLINICAL_MUTATION matrix.
const CLINICAL_MUTATION_ROLES = new Set<AuthorityRole>([
  AuthorityRole.NURSE,
  AuthorityRole.PARAMEDIC,
  AuthorityRole.THERAPIST,
  AuthorityRole.PHARMACIST,
]);

export interface ResolvedAuthorityRole {
  primaryRole: AuthorityRole | null;
  authorities: readonly string[];
}

export const authorityForRole = (role: AuthorityRole): string => ROLE_AUTHORITIES[role];

export const resolveAuthorityRole = (authorities: readonly string[] | null | undefined): ResolvedAuthorityRole => {
  const fullAuthorities = [...(authorities ?? [])];
  return {
    primaryRole: ROLE_PRECEDENCE.find(role => fullAuthorities.includes(authorityForRole(role))) ?? null,
    authorities: fullAuthorities,
  };
};

/**
 * Does this account hold any role this portal recognises beyond a bare {@code ROLE_USER}?
 *
 * <p>The distinction that matters for an applicant: they hold {@code ROLE_USER} and nothing else
 * until their credentials are approved, so every clinical destination refuses them. Note that
 * {@link resolveAuthorityRole} returns {@code USER} rather than {@code null} for such an account —
 * {@code ROLE_USER} is last in the precedence list — so "no clinical role" is <em>not</em> a null
 * check, and writing it as one silently matches nobody.
 *
 * <p><b>Both halves of the condition are load-bearing, and the null half is what answers
 * `../docs/backlog.md` item 44.</b> {@code null} is what {@link resolveAuthorityRole} returns for an
 * account holding only authorities this portal does not know, and the one that actually occurs is
 * {@code ROLE_ANGEL}: it was one of nine disciplines here until 2026-09-08, hc-patient still issues
 * it, all three gateways share one signing key, and an account on a long-lived database may still
 * carry the grant. An unrecognised authority must resolve to <em>not a clinician</em> rather than to
 * "unknown, so probably one" — otherwise such an account is routed into the clinician shell and every
 * call behind it 403s, which is the defect item 44 was opened for. It lands on the applicant view
 * instead: the honest destination for somebody this portal holds no role for, and an angel's real
 * destination is `patient.abofonsa.com`.
 *
 * <p>ROLE_ADMIN counts: an administrator works the review queue and needs the portal around them.
 */
export const hasClinicalAuthority = (authorities: readonly string[] | null | undefined): boolean => {
  const { primaryRole } = resolveAuthorityRole(authorities);
  return primaryRole !== null && primaryRole !== AuthorityRole.USER;
};

export const hasHealthConnectRole = (
  authorities: readonly string[] | null | undefined,
  roles: AuthorityRole | readonly AuthorityRole[],
): boolean => {
  const requestedRoles = Array.isArray(roles) ? roles : [roles];
  const fullAuthorities = authorities ?? [];
  return requestedRoles.some(role => fullAuthorities.includes(authorityForRole(role)));
};

export const hasHealthConnectPermission = (
  authorities: readonly string[] | null | undefined,
  permission: HealthConnectPermission,
): boolean => {
  const resolved = resolveAuthorityRole(authorities);
  if (hasHealthConnectRole(resolved.authorities, [AuthorityRole.ADMIN, AuthorityRole.DOCTOR])) {
    return true;
  }
  return (
    CLINICAL_MUTATION_ROLES.has(resolved.primaryRole ?? AuthorityRole.USER) &&
    (permission === 'manageCase' || permission === 'manageActivity' || permission === 'manageReport')
  );
};
