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
  AuthorityRole.USER,
];

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
