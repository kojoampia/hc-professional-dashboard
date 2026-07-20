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
import { MockHealthConnectRepository } from 'app/health-connect/health-connect.repository';

import NavbarComponent from './navbar.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Navbar Component', () => {
  let comp: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
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

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NavbarComponent, RouterTestingModule.withRoutes([]), TranslateModule.forRoot()],
      providers: [LoginService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideTemplate(NavbarComponent, '')
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NavbarComponent);
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

  it('should resolve a translated clinical role badge and optional shift from the authenticated account', () => {
    accountService.authenticate({ ...account, authorities: ['ROLE_DOCTOR'], login: 'doctor' });

    comp.ngOnInit();

    expect(comp.roleBadgeTranslationKey).toBe('healthConnect.roles.doctor');
    expect(comp.shiftLabel).toEqual({
      translationKey: 'healthConnect.roster.activeShift',
      translationParams: { time: '20:00' },
    });
    const repository = TestBed.inject(MockHealthConnectRepository);
    repository.unsubscribeProfessionalFromRoster('professional-doctor', 'ward-3-night');
    expect(comp.shiftLabel).toBeNull();
    repository.subscribeProfessionalToRoster('professional-doctor', 'ward-3-night');
    expect(comp.shiftLabel).toEqual({
      translationKey: 'healthConnect.roster.activeShift',
      translationParams: { time: '20:00' },
    });
  });

  it('should not resolve clinical navbar context for a logged-out account', () => {
    comp.ngOnInit();

    expect(comp.roleBadgeTranslationKey).toBeNull();
    expect(comp.shiftLabel).toBeNull();
  });
});
