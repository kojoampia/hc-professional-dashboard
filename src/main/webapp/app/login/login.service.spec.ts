import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { throwError } from 'rxjs';

import { AuthServerProvider } from 'app/core/auth/auth-jwt.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { WIZARD_PROFILE_STORAGE_KEY, readWizardProfileId, storeWizardProfileId } from 'app/onboarding/wizard.service';

import { LoginService } from './login.service';

describe('LoginService', () => {
  let service: LoginService;
  let progress: OnboardingProgressService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoginService);
    progress = TestBed.inject(OnboardingProgressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    sessionStorage.clear();
    httpMock.verify();
  });

  /**
   * `OnboardingProgressService.clear()` had no caller at all, so signing out and in as a second
   * account on the same browser showed the first one's completion figure until something forced a
   * reload. On a shared ward device that is two clinicians.
   */
  it('should drop the cached onboarding progress on sign-out', () => {
    progress.load();
    httpMock
      .expectOne(request => request.url.endsWith('api/onboarding/progress'))
      .flush({ percent: 100, complete: true, requirements: [] });
    expect(progress.percent()).toBe(100);

    service.logout();

    expect(progress.progress()).toBeNull();
    expect(progress.complete()).toBeNull();
  });

  /**
   * Cleared before the request rather than beside `authenticate(null)` in its `complete` handler: a
   * sign-out whose own call fails never completes, and the figure left behind would be read as the
   * next account's.
   */
  it('should drop it even when the sign-out call itself fails', () => {
    progress.load();
    httpMock
      .expectOne(request => request.url.endsWith('api/onboarding/progress'))
      .flush({ percent: 100, complete: true, requirements: [] });
    jest.spyOn(TestBed.inject(AuthServerProvider), 'logout').mockReturnValue(throwError(() => new Error('offline')));

    service.logout();

    expect(progress.progress()).toBeNull();
  });

  /**
   * ⛔ **The wizard's step cursor, beside the meter — a sharper version of the same argument.**
   * `sessionStorage` survives a sign-out, so the key step 2 writes outlived the session that wrote
   * it, and the next account in that tab would have had step 3 adopt the previous clinician's
   * profile id. The two cases above are about a completion *percentage*; this is a stored
   * identifier, so the argument is strictly stronger.
   */
  it('should drop the wizard step cursor on sign-out', () => {
    storeWizardProfileId('p-1');
    expect(readWizardProfileId()).toBe('p-1');

    service.logout();

    expect(readWizardProfileId()).toBeNull();
    expect(sessionStorage.getItem(WIZARD_PROFILE_STORAGE_KEY)).toBeNull();
  });

  /** And before the request, for the reason the meter's own pair of cases establishes. */
  it('should drop the step cursor even when the sign-out call itself fails', () => {
    storeWizardProfileId('p-1');
    jest.spyOn(TestBed.inject(AuthServerProvider), 'logout').mockReturnValue(throwError(() => new Error('offline')));

    service.logout();

    expect(readWizardProfileId()).toBeNull();
  });
});
