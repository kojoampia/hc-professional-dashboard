import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FakeHealthConnectRepository } from '../testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import DashboardPageComponent from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  let component: DashboardPageComponent;
  let fixture: ComponentFixture<DashboardPageComponent>;
  let httpMock: HttpTestingController;
  const router = { navigate: jest.fn(() => Promise.resolve(true)), url: '/dashboard' };

  /** The earnings card, against adminservice. */
  const earningsRequest = (): ReturnType<HttpTestingController['expectOne']> =>
    httpMock.expectOne(request => request.url.endsWith('services/adminservice/api/professionals/me/earnings'));

  /**
   * The other request this page makes on init: onboarding completion, which decides whether the
   * clinician is nudged to finish their profile. Flushed complete by default so the redirect below
   * is only exercised where a test asks for it.
   */
  const progressRequest = (): ReturnType<HttpTestingController['expectOne']> =>
    httpMock.expectOne(request => request.url.endsWith('services/professionalservice/api/onboarding/progress'));

  const flushProgress = (complete: boolean): void => progressRequest().flush({ percent: complete ? 100 : 25, complete, requirements: [] });

  beforeEach(async () => {
    // Installed before the component exists: ngOnInit schedules the incomplete-profile timer, and a
    // timer registered against the real clock cannot be advanced by jest.advanceTimersByTime later.
    jest.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository },
        { provide: Router, useValue: router },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
      .overrideComponent(DashboardPageComponent, { set: { template: '' } })
      .compileComponents();
    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(FakeHealthConnectRepository).reset();
    fixture.detectChanges();
    router.navigate.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    httpMock.verify();
  });

  it('derives demographic and case-status KPI counts from the repository signals', () => {
    flushProgress(true);
    earningsRequest().flush({});
    expect(component.demographicCards()).toEqual([
      expect.objectContaining({ id: 'patients', count: 7 }),
      expect.objectContaining({ id: 'female', count: 3 }),
      expect.objectContaining({ id: 'male', count: 4 }),
      expect.objectContaining({ id: 'kids', count: 2 }),
    ]);
    expect(component.caseCards()).toEqual([
      expect.objectContaining({ id: 'urgent', count: 2 }),
      expect.objectContaining({ id: 'open', count: 2 }),
      expect.objectContaining({ id: 'closed', count: 3 }),
    ]);
  });

  it('navigates KPI selections to their query-backed directory and case URLs', () => {
    flushProgress(true);
    earningsRequest().flush({});
    component.navigateDemographic('female');
    component.navigateDemographic('kids');
    component.navigateCaseStatus('urgent');

    expect(router.navigate).toHaveBeenNthCalledWith(1, ['/patients'], { queryParams: { gender: 'female' } });
    expect(router.navigate).toHaveBeenNthCalledWith(2, ['/patients'], { queryParams: { children: 'true' } });
    expect(router.navigate).toHaveBeenNthCalledWith(3, ['/cases'], { queryParams: { status: 'urgent' } });
  });

  it('fills the earnings card from adminservice, monthly', () => {
    flushProgress(true);
    const req = earningsRequest();
    expect(req.request.params.get('granularity')).toBe('MONTHLY');
    req.flush({ totalAccrued: 1100, shiftsCompleted: 2, currency: 'GHS' });

    expect(component.earnings()).toEqual(expect.objectContaining({ totalAccrued: 1100, shiftsCompleted: 2 }));
  });

  /**
   * The card is one panel on a dashboard whose other panels come from a different stack. A
   * clinician with no professional record yet (404), or an adminservice outage, must leave the rest
   * of the dashboard intact — the card simply does not render.
   */
  it.each([
    ['no professional record', 404],
    ['adminservice unavailable', 503],
  ])('leaves the rest of the dashboard working when earnings fail: %s', (_label, status) => {
    flushProgress(true);
    earningsRequest().flush(null, { status, statusText: 'error' });

    expect(component.earnings()).toBeNull();
    expect(component.demographicCards()).toHaveLength(4);
    expect(component.caseCards()).toHaveLength(3);
  });

  it('formats money in the current language with the currency the rates were set in', () => {
    flushProgress(true);
    earningsRequest().flush({});

    expect(component.money(1100, 'GHS')).toContain('1,100');
    // No currency means nothing in the window was priced — show the bare figure rather than
    // inventing a denomination for it.
    expect(component.money(1100, null)).toBe('1,100');
  });

  /**
   * The nudge for a clinician who has not finished their profile.
   *
   * <p>Fake timers rather than a real two-second wait, and each case asserts the guard it depends
   * on: an unfinished profile moves, a finished one does not, an unanswered request does not (null
   * is not "incomplete"), and someone who navigated away in the meantime is left where they went.
   */
  describe('incomplete-profile redirect', () => {
    const settle = (): void => {
      earningsRequest().flush({});
      jest.advanceTimersByTime(2000);
    };

    it('moves an unfinished profile to the application tab after two seconds', () => {
      flushProgress(false);

      settle();

      expect(router.navigate).toHaveBeenCalledWith(['/account/profile'], { queryParams: { tab: 'application' } });
    });

    it('does not move before the two seconds are up', () => {
      flushProgress(false);
      earningsRequest().flush({});

      jest.advanceTimersByTime(1500);

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('leaves a finished profile alone', () => {
      flushProgress(true);

      settle();

      expect(router.navigate).not.toHaveBeenCalled();
    });

    /** Unknown is not incomplete — bouncing someone whose profile is finished is the worse error. */
    it('leaves the clinician alone when completion could not be determined', () => {
      progressRequest().flush(null, { status: 500, statusText: 'Server Error' });

      settle();

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('does not yank someone who has already navigated away', () => {
      flushProgress(false);
      router.url = '/patients';

      settle();

      expect(router.navigate).not.toHaveBeenCalled();
      router.url = '/dashboard';
    });

    it('cancels the timer when the dashboard is destroyed', () => {
      flushProgress(false);
      earningsRequest().flush({});

      fixture.destroy();
      jest.advanceTimersByTime(2000);

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
