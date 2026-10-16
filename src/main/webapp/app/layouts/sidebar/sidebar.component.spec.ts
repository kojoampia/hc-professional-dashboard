jest.mock('app/login/login.service');

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { LoginService } from 'app/login/login.service';
import { DutyRosterAssignmentsService } from 'app/health-connect/api/duty-roster-assignments.service';
import { ShiftLabel } from 'app/health-connect/health-connect.models';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { WIZARD_PANES, wizardPanePath } from 'app/onboarding/wizard.service';

import SidebarComponent from './sidebar.component';
import { SHELL_NAV_GROUPS } from './shell-navigation';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Sidebar Component', () => {
  let comp: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let accountService: AccountService;
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
  });

  it('asks the server nothing about which profiles are active', () => {
    // The sidebar used to read `inProduction` off GET /management/info via ProfileService, and then
    // never use it — a management call from a browser, for a field with no consumer. Both are gone.
    comp.ngOnInit();

    expect(comp).not.toHaveProperty('inProduction');
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

  /**
   * ⛔ **This case has now asserted both answers, and the history is the point.** It required the
   * wizard's absence before T8, required its **presence** through T8 — *"should point the account
   * group at the onboarding wizard as well as the profile page"* — and requires its absence again
   * from `backlog.md` row 248. Twice flipped is twice the reason to say which question it answers,
   * because the two readings look identical and are not.
   *
   * <p>⚠ **It is a question about the NAV MODEL, never about the wizard.** `profile.md:275-277` —
   * *"Onboarding is displayed in a single dialog wizard pane, not in tabs"* — is what T8 built and
   * row 248 does not touch it: the four panes keep their routes, the dashboard still redirects into
   * them while a step is outstanding, and a bookmark still resolves. What row 248 removes is the
   * standing **advertisement** of a one-time event. The previous version of this case read the
   * specification's sentence about the wizard's *shape* as a claim about its *discoverability*, and
   * those are different sentences.
   *
   * <p>⭐ **So the assertion is written against `wizardPanePath` rather than a typed string** — the
   * same helper the route table and the dashboard redirect read. A pane address that changed would
   * otherwise make this case pass by missing the thing it is looking for, which is the one way an
   * absence assertion can go quietly wrong.
   *
   * <p>`/account/profile` stays and is now the account group's only clinician destination: the My
   * Profile read view T9 built, and where an approved clinician edits what they need to.
   */
  it('should not advertise the onboarding wizard in the nav, while keeping the profile page', () => {
    const paths = SHELL_NAV_GROUPS.flatMap(group => group.items).map(item => item.path);

    expect(paths).toContain('/account/profile');
    expect(paths).not.toContain(wizardPanePath('account'));
    expect(WIZARD_PANES.map(pane => wizardPanePath(pane)).some(path => paths.includes(path))).toBe(false);
  });

  it('should not offer the removed about, settings and password destinations', () => {
    const paths = SHELL_NAV_GROUPS.flatMap(group => group.items).map(item => item.path);

    expect(paths).not.toContain('/about');
    expect(paths).not.toContain('/account/settings');
    expect(paths).not.toContain('/account/password');
  });
});
