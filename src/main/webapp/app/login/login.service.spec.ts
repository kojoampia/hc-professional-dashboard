import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { throwError } from 'rxjs';

import { AuthServerProvider } from 'app/core/auth/auth-jwt.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';

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

  afterEach(() => httpMock.verify());

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
});
