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
