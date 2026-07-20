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
