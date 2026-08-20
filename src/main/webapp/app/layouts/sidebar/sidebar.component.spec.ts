jest.mock('app/login/login.service');

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { ProfileInfo } from 'app/layouts/profiles/profile-info.model';
import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { ProfileService } from 'app/layouts/profiles/profile.service';
import { LoginService } from 'app/login/login.service';
import { DutyRosterAssignmentsService } from 'app/health-connect/api/duty-roster-assignments.service';
import { ShiftLabel } from 'app/health-connect/health-connect.models';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import SidebarComponent from './sidebar.component';
import { SHELL_NAV_GROUPS } from './shell-navigation';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Sidebar Component', () => {
  let comp: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let accountService: AccountService;
  let profileService: ProfileService;
  const account: Account = {
    activated: true,
    authorities: [],
    email: '',
    firstName: 'John',
    langKey: '',
    lastName: 'Doe',
    login: 'john.doe',
    imageUrl: '',
  };

  const groupByLabel = (labelKey: string) => SHELL_NAV_GROUPS.find(group => group.labelKey === labelKey)!;
  let currentShiftLabel: ShiftLabel | null;
  let dutyRosterAssignments: { loadMyAssignments: jest.Mock; shiftLabel: () => ShiftLabel | null };

  beforeEach(waitForAsync(() => {
    currentShiftLabel = null;
    dutyRosterAssignments = { loadMyAssignments: jest.fn(), shiftLabel: () => currentShiftLabel };
    TestBed.configureTestingModule({
      imports: [SidebarComponent, RouterTestingModule.withRoutes([]), TranslateModule.forRoot()],
      providers: [
        LoginService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: DutyRosterAssignmentsService, useValue: dutyRosterAssignments as unknown as DutyRosterAssignmentsService },
      ],
    })
      .overrideTemplate(SidebarComponent, '')
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarComponent);
    comp = fixture.componentInstance;
    accountService = TestBed.inject(AccountService);
    profileService = TestBed.inject(ProfileService);
  });

  it('Should call profileService.getProfileInfo on init', () => {
    // GIVEN
    jest.spyOn(profileService, 'getProfileInfo').mockReturnValue(of(new ProfileInfo()));

    // WHEN
    comp.ngOnInit();

    // THEN
    expect(profileService.getProfileInfo).toHaveBeenCalled();
  });

  it('Should hold current authenticated user in variable account', () => {
    // WHEN
    comp.ngOnInit();

    // THEN
    expect(comp.account).toBeNull();

    // WHEN
    accountService.authenticate(account);

    // THEN
    expect(comp.account).toEqual(account);

    // WHEN
    accountService.authenticate(null);

    // THEN
    expect(comp.account).toBeNull();
  });

  it('Should hold current authenticated user in variable account if user is authenticated before page load', () => {
    // GIVEN
    accountService.authenticate(account);

    // WHEN
    comp.ngOnInit();

    // THEN
    expect(comp.account).toEqual(account);

    // WHEN
    accountService.authenticate(null);

    // THEN
    expect(comp.account).toBeNull();
  });

  it('should resolve a translated clinical role badge and drive the shift label from real assignments (WP6 gate)', () => {
    accountService.authenticate({ ...account, authorities: ['ROLE_DOCTOR'], login: 'doctor' });

    comp.ngOnInit();

    expect(comp.roleBadgeTranslationKey).toBe('healthConnect.roles.doctor');
    // the sidebar asks the real assignments service, not a mock repository
    expect(dutyRosterAssignments.loadMyAssignments).toHaveBeenCalled();
    expect(comp.shiftLabel).toBeNull();

    currentShiftLabel = { translationKey: 'healthConnect.roster.activeShift', translationParams: { time: '14:00' } };
    expect(comp.shiftLabel).toEqual({
      translationKey: 'healthConnect.roster.activeShift',
      translationParams: { time: '14:00' },
    });
  });

  it('should not resolve clinical shell context for a logged-out account', () => {
    comp.ngOnInit();

    expect(comp.roleBadgeTranslationKey).toBeNull();
    expect(comp.shiftLabel).toBeNull();
  });

  /**
   * There is no signed-out sidebar any more, so this asserts emptiness rather than the old
   * Home-and-sign-in pair. The component only renders inside ShellComponent, which app.routes.ts
   * guards as a whole — a visitor with no account gets AuthShellComponent, which carries no
   * navigation at all.
   *
   * The visibility rules are kept and tested because they still run: the account resolves
   * asynchronously, so the sidebar is briefly constructed with a null account on every cold start
   * of the portal, and it must render nothing rather than a flash of the wrong menu.
   */
  it('should offer nothing at all when the account has not resolved', () => {
    comp.ngOnInit();

    expect(comp.visibleItems(groupByLabel('healthConnect.navigation.care'))).toEqual([]);
    expect(comp.groupVisible(groupByLabel('global.menu.account.main'))).toBe(false);
    expect(comp.groupVisible(groupByLabel('global.menu.admin.main'))).toBe(false);
  });

  it('should expose care and account groups to an authenticated clinician but hide administration', () => {
    accountService.authenticate({ ...account, authorities: ['ROLE_DOCTOR'] });

    comp.ngOnInit();

    const care = groupByLabel('healthConnect.navigation.care');
    expect(comp.visibleItems(care).map(item => item.labelKey)).toEqual([
      'healthConnect.navigation.dashboard',
      'healthConnect.patient.directory',
      'healthConnect.case.queue',
      'healthConnect.navigation.dutyRoster',
    ]);
    expect(comp.groupVisible(groupByLabel('global.menu.account.main'))).toBe(true);
    expect(comp.groupVisible(groupByLabel('global.menu.admin.main'))).toBe(false);
  });

  it('should expose the administration group to ROLE_ADMIN', () => {
    accountService.authenticate({ ...account, authorities: ['ROLE_ADMIN'] });

    comp.ngOnInit();

    expect(comp.groupVisible(groupByLabel('global.menu.admin.main'))).toBe(true);
  });

  it('should derive user initials and display name from the account', () => {
    accountService.authenticate(account);

    comp.ngOnInit();

    expect(comp.userInitials).toBe('JD');
    expect(comp.userDisplayName).toBe('John Doe');

    accountService.authenticate({ ...account, firstName: null, lastName: null });
    expect(comp.userInitials).toBe('JO');
    expect(comp.userDisplayName).toBe('john.doe');
  });

  /**
   * The user card is now the <b>only</b> way into the account settings page — the "Settings" nav
   * item was removed in favour of it, so a card that stops linking there strands the page with no
   * entry point at all and nothing else in the suite would notice.
   *
   * <p>Asserted against the template source because this spec renders with an overridden (empty)
   * template, so there is no DOM to query.
   */
  it('should route the user card to the account settings page', () => {
    const template = readFileSync(join(__dirname, 'sidebar.component.html'), 'utf8');

    expect(template).toContain('data-cy="accountMenu"');
    expect(template).toContain('routerLink="/account/profile"');
  });

  /**
   * All three were deliberately removed. Settings and password are sections of the profile page
   * reached through the user card above; the "Why Abofonsa" page is gone entirely. Re-adding any of
   * them would resurrect a route that no longer exists.
   */
  /**
   * An applicant holds only ROLE_USER until their credentials are approved, and every clinical
   * destination refuses them. Onboarding used to sidestep this by rendering on the signed-out
   * shell; now that it is a tab on the profile page inside the portal, the sidebar has to hide the
   * group instead — otherwise they read a list of rooms they cannot enter.
   */
  it('should hide the clinical group from an account with no clinical role', () => {
    accountService.authenticate({ ...account, authorities: ['ROLE_USER'] });

    comp.ngOnInit();

    expect(comp.groupVisible(groupByLabel('healthConnect.navigation.care'))).toBe(false);
    expect(comp.groupVisible(groupByLabel('global.menu.account.main'))).toBe(true);
  });

  /**
   * The counterpart, and the reason this is keyed on authority rather than on the application
   * reaching ACTIVE: clinicians seeded or created before onboarding existed hold a clinical role
   * and no application at all, and gating on the application would take the portal away from them.
   */
  it('should keep the clinical group for a clinician with no application', () => {
    accountService.authenticate({ ...account, authorities: ['ROLE_USER', 'ROLE_DOCTOR'] });

    comp.ngOnInit();

    expect(comp.groupVisible(groupByLabel('healthConnect.navigation.care'))).toBe(true);
  });

  it('should point the account group at the profile page rather than the retired wizard', () => {
    const paths = SHELL_NAV_GROUPS.flatMap(group => group.items).map(item => item.path);

    expect(paths).toContain('/account/profile');
    expect(paths).not.toContain('/onboarding');
  });

  it('should not offer the removed about, settings and password destinations', () => {
    const paths = SHELL_NAV_GROUPS.flatMap(group => group.items).map(item => item.path);

    expect(paths).not.toContain('/about');
    expect(paths).not.toContain('/account/settings');
    expect(paths).not.toContain('/account/password');
  });
});
