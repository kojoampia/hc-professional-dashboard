import { authorityForRole, hasHealthConnectPermission, hasHealthConnectRole, resolveAuthorityRole } from './authority-role';
import { AuthorityRole } from './health-connect.models';

describe('HealthConnect authority resolution', () => {
  it('uses precedence for the badge while retaining all account authorities', () => {
    const resolved = resolveAuthorityRole(['ROLE_USER', 'ROLE_NURSE', 'ROLE_ADMIN', 'ROLE_EXTERNAL']);

    expect(resolved.primaryRole).toBe(AuthorityRole.ADMIN);
    expect(resolved.authorities).toEqual(['ROLE_USER', 'ROLE_NURSE', 'ROLE_ADMIN', 'ROLE_EXTERNAL']);
    expect(hasHealthConnectRole(resolved.authorities, AuthorityRole.NURSE)).toBe(true);
  });

  it('maps the known JHipster roles and handles accounts without a clinical role', () => {
    expect(authorityForRole(AuthorityRole.ADMIN)).toBe('ROLE_ADMIN');
    expect(authorityForRole(AuthorityRole.USER)).toBe('ROLE_USER');
    expect(resolveAuthorityRole(['ROLE_EXTERNAL']).primaryRole).toBeNull();
    expect(hasHealthConnectRole([], [AuthorityRole.ADMIN, AuthorityRole.DOCTOR])).toBe(false);
  });

  it('applies only the approved local UI mutation matrix', () => {
    expect(hasHealthConnectPermission(['ROLE_ADMIN'], 'managePatient')).toBe(true);
    expect(hasHealthConnectPermission(['ROLE_DOCTOR'], 'manageDutyRoster')).toBe(true);
    expect(hasHealthConnectPermission(['ROLE_NURSE'], 'manageCase')).toBe(true);
    expect(hasHealthConnectPermission(['ROLE_PARAMEDIC'], 'manageActivity')).toBe(true);
    expect(hasHealthConnectPermission(['ROLE_THERAPIST'], 'manageReport')).toBe(true);
    expect(hasHealthConnectPermission(['ROLE_PHARMACIST'], 'managePatient')).toBe(false);
    expect(hasHealthConnectPermission(['ROLE_CARER'], 'manageCase')).toBe(false);
    expect(hasHealthConnectPermission(['ROLE_USER'], 'manageReport')).toBe(false);
  });
});

describe('WP1 role-set extension (Angel, Chemist, Technician)', () => {
  it('resolves the three new backend roles and keeps them read-only in the mutation matrix', () => {
    expect(resolveAuthorityRole(['ROLE_ANGEL']).primaryRole).toBe(AuthorityRole.ANGEL);
    expect(resolveAuthorityRole(['ROLE_CHEMIST']).primaryRole).toBe(AuthorityRole.CHEMIST);
    expect(resolveAuthorityRole(['ROLE_TECHNICIAN']).primaryRole).toBe(AuthorityRole.TECHNICIAN);
    // clinical roles outrank the support roles when both are present
    expect(resolveAuthorityRole(['ROLE_TECHNICIAN', 'ROLE_NURSE']).primaryRole).toBe(AuthorityRole.NURSE);
    // read-only in v1 — aligned with api AuthoritiesConstants.CLINICAL_MUTATION
    for (const authority of ['ROLE_ANGEL', 'ROLE_CHEMIST', 'ROLE_TECHNICIAN']) {
      expect(hasHealthConnectPermission([authority], 'manageCase')).toBe(false);
      expect(hasHealthConnectPermission([authority], 'managePatient')).toBe(false);
    }
    expect(hasHealthConnectPermission(['ROLE_NURSE'], 'manageCase')).toBe(true);
  });
});
