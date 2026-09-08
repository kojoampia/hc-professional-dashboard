import {
  authorityForRole,
  hasClinicalAuthority,
  hasHealthConnectPermission,
  hasHealthConnectRole,
  resolveAuthorityRole,
} from './authority-role';
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

describe('WP1 role-set extension (Chemist, Technician)', () => {
  it('resolves the new backend roles and keeps them read-only in the mutation matrix', () => {
    expect(resolveAuthorityRole(['ROLE_CHEMIST']).primaryRole).toBe(AuthorityRole.CHEMIST);
    expect(resolveAuthorityRole(['ROLE_TECHNICIAN']).primaryRole).toBe(AuthorityRole.TECHNICIAN);
    // clinical roles outrank the support roles when both are present
    expect(resolveAuthorityRole(['ROLE_TECHNICIAN', 'ROLE_NURSE']).primaryRole).toBe(AuthorityRole.NURSE);
    // read-only in v1 — aligned with api AuthoritiesConstants.CLINICAL_MUTATION
    for (const authority of ['ROLE_CHEMIST', 'ROLE_TECHNICIAN']) {
      expect(hasHealthConnectPermission([authority], 'manageCase')).toBe(false);
      expect(hasHealthConnectPermission([authority], 'managePatient')).toBe(false);
    }
    expect(hasHealthConnectPermission(['ROLE_NURSE'], 'manageCase')).toBe(true);
  });
});

/**
 * `../docs/backlog.md` item 44 — an angel supports a patient and has no role in this portal.
 *
 * The authority is gone from this stack, but a token carrying it still arrives: hc-patient issues
 * `ROLE_ANGEL`, the three gateways share one signing key, and an account on a long-lived database may
 * hold a grant made before the removal. **What has to be true is a runtime fact about an unrecognised
 * authority, so these assert behaviour rather than the absence of an enum member** — which TypeScript
 * would have caught anyway, and which says nothing about what such an account is shown.
 *
 * The failure being guarded is specific. `hasClinicalAuthority` drives `clinicalOnly` in
 * `sidebar.component.ts` and the "am I a clinician" branch in `dashboard-page.component.ts`, so
 * reading an unknown authority as a role would put this account into the full clinician shell with
 * every call behind it answering 403 — worse than a refusal, because the destination is offered.
 */
describe('an authority this portal does not recognise (item 44: ROLE_ANGEL)', () => {
  it('resolves to no primary role at all, not to an unknown one', () => {
    expect(resolveAuthorityRole(['ROLE_ANGEL']).primaryRole).toBeNull();
    // ...while still carrying it, so nothing downstream is lied to about what the account holds.
    expect(resolveAuthorityRole(['ROLE_ANGEL']).authorities).toEqual(['ROLE_ANGEL']);
  });

  it('is not a clinician, alone or beside the base user authority', () => {
    expect(hasClinicalAuthority(['ROLE_ANGEL'])).toBe(false);
    // The shape a real account takes — every account either gateway creates also holds ROLE_USER.
    expect(hasClinicalAuthority(['ROLE_USER', 'ROLE_ANGEL'])).toBe(false);
    // The control: without it this would pass on a function that refuses everybody.
    expect(hasClinicalAuthority(['ROLE_USER', 'ROLE_NURSE'])).toBe(true);
  });

  it('holds no permission in the mutation matrix and matches no role query', () => {
    expect(hasHealthConnectPermission(['ROLE_ANGEL'], 'manageCase')).toBe(false);
    expect(hasHealthConnectPermission(['ROLE_ANGEL'], 'managePatient')).toBe(false);
    expect(hasHealthConnectRole(['ROLE_ANGEL'], Object.values(AuthorityRole))).toBe(false);
  });

  it('does not name the care angel among the roles this portal badges', () => {
    // Derived rather than a list: a tenth role added next year is covered without editing this.
    expect(Object.values(AuthorityRole).map(role => authorityForRole(role))).not.toContain('ROLE_ANGEL');
  });
});
