import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { OnboardingProgressService } from './onboarding-progress.service';

describe('OnboardingProgressService', () => {
  let service: OnboardingProgressService;
  let httpMock: HttpTestingController;

  const progressRequest = () => httpMock.expectOne(request => request.url.endsWith('api/onboarding/progress'));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OnboardingProgressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('holds what the server says, and does not recompute it', () => {
    service.load();

    progressRequest().flush({ percent: 62, complete: false, requirements: [{ key: 'license', done: false }] });

    expect(service.percent()).toBe(62);
    expect(service.complete()).toBe(false);
    expect(service.progress()?.requirements).toEqual([{ key: 'license', done: false }]);
  });

  /**
   * The dashboard and the profile page both ask on init, and a clinician who lands on one and is
   * moved to the other would otherwise issue two requests for the same answer.
   */
  it('does not issue a second request while one is in flight', () => {
    service.load();
    service.load();

    progressRequest().flush({ percent: 0, complete: false, requirements: [] });
  });

  it('re-asks after a save that may have satisfied a requirement', () => {
    service.load();
    progressRequest().flush({ percent: 50, complete: false, requirements: [] });

    service.refresh();
    progressRequest().flush({ percent: 75, complete: false, requirements: [] });

    expect(service.percent()).toBe(75);
  });

  /**
   * Null, not false. Callers treat "incomplete" as a reason to move someone to their profile, and a
   * failed request must not do that to a clinician whose profile is finished.
   */
  it('leaves completion unknown when the request fails', () => {
    service.load();

    progressRequest().flush(null, { status: 500, statusText: 'Server Error' });

    expect(service.complete()).toBeNull();
    expect(service.progress()).toBeNull();
  });

  it('forgets the previous account on clear', () => {
    service.load();
    progressRequest().flush({ percent: 100, complete: true, requirements: [] });

    service.clear();

    expect(service.progress()).toBeNull();
    expect(service.complete()).toBeNull();
  });
});
