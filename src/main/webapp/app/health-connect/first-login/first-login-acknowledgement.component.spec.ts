import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { AlertService } from 'app/core/util/alert.service';

import { OnboardingApiService } from '../api/onboarding-api.service';
import FirstLoginAcknowledgementComponent from './first-login-acknowledgement.component';

/**
 * WP6: the first-login interstitial appears exactly when an ACTIVE application
 * has not yet been acknowledged, and disappears permanently after the
 * (idempotent, server-audited) acknowledgement.
 */
describe('FirstLoginAcknowledgementComponent', () => {
  let fixture: ComponentFixture<FirstLoginAcknowledgementComponent>;
  let api: { acknowledgementStatus: jest.Mock; getOwnApplication: jest.Mock; acknowledge: jest.Mock };
  const authenticationState = new BehaviorSubject<Account | null>(null);
  const account: Account = {
    activated: true,
    authorities: ['ROLE_USER'],
    email: 'nurse@example.test',
    firstName: null,
    langKey: 'en',
    lastName: null,
    login: 'nurse',
    imageUrl: null,
  };

  const configure = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [FirstLoginAcknowledgementComponent, TranslateModule.forRoot()],
      providers: [
        { provide: OnboardingApiService, useValue: api as unknown as OnboardingApiService },
        { provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } },
        { provide: AlertService, useValue: { showToast: jest.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FirstLoginAcknowledgementComponent);
    fixture.detectChanges();
  };

  beforeEach(() => {
    api = {
      acknowledgementStatus: jest.fn(() => of({ acknowledged: false })),
      getOwnApplication: jest.fn(() => of({ id: 'app-1', accountId: 'nurse', status: 'ACTIVE' })),
      acknowledge: jest.fn(() => of({})),
    };
  });

  it('shows for an authenticated professional with an unacknowledged ACTIVE application', async () => {
    authenticationState.next(account);
    await configure();
    expect(fixture.nativeElement.querySelector('[data-cy="firstLoginInterstitial"]')).toBeTruthy();
  });

  it('stays hidden while the application is not yet ACTIVE', async () => {
    api.getOwnApplication.mockReturnValue(of({ id: 'app-1', accountId: 'nurse', status: 'CREDENTIAL_REVIEW' }));
    authenticationState.next(account);
    await configure();
    expect(fixture.nativeElement.querySelector('[data-cy="firstLoginInterstitial"]')).toBeNull();
  });

  it('stays hidden when already acknowledged, logged out, or without an application', async () => {
    api.acknowledgementStatus.mockReturnValue(of({ acknowledged: true }));
    authenticationState.next(account);
    await configure();
    expect(fixture.nativeElement.querySelector('[data-cy="firstLoginInterstitial"]')).toBeNull();

    api.getOwnApplication.mockReturnValue(throwError(() => new Error('404')));
    api.acknowledgementStatus.mockReturnValue(of({ acknowledged: false }));
    authenticationState.next(account);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="firstLoginInterstitial"]')).toBeNull();

    authenticationState.next(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="firstLoginInterstitial"]')).toBeNull();
  });

  it('records the acknowledgement once and dismisses the dialog', async () => {
    authenticationState.next(account);
    await configure();

    (fixture.nativeElement.querySelector('[data-cy="acknowledge"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.acknowledge).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[data-cy="firstLoginInterstitial"]')).toBeNull();
    expect(TestBed.inject(AlertService).showToast).toHaveBeenCalledWith('healthConnect.toast.acknowledged');
  });
});
