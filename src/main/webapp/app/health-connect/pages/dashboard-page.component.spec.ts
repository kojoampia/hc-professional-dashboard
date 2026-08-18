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
  const router = { navigate: jest.fn(() => Promise.resolve(true)) };

  /** The one request this page makes on init: the earnings card, against adminservice. */
  const earningsRequest = (): ReturnType<HttpTestingController['expectOne']> =>
    httpMock.expectOne(request => request.url.endsWith('services/adminservice/api/professionals/me/earnings'));

  beforeEach(async () => {
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

  afterEach(() => httpMock.verify());

  it('derives demographic and case-status KPI counts from the repository signals', () => {
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
    earningsRequest().flush({});
    component.navigateDemographic('female');
    component.navigateDemographic('kids');
    component.navigateCaseStatus('urgent');

    expect(router.navigate).toHaveBeenNthCalledWith(1, ['/patients'], { queryParams: { gender: 'female' } });
    expect(router.navigate).toHaveBeenNthCalledWith(2, ['/patients'], { queryParams: { children: 'true' } });
    expect(router.navigate).toHaveBeenNthCalledWith(3, ['/cases'], { queryParams: { status: 'urgent' } });
  });

  it('fills the earnings card from adminservice, monthly', () => {
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
    earningsRequest().flush(null, { status, statusText: 'error' });

    expect(component.earnings()).toBeNull();
    expect(component.demographicCards()).toHaveLength(4);
    expect(component.caseCards()).toHaveLength(3);
  });

  it('formats money in the current language with the currency the rates were set in', () => {
    earningsRequest().flush({});

    expect(component.money(1100, 'GHS')).toContain('1,100');
    // No currency means nothing in the window was priced — show the bare figure rather than
    // inventing a denomination for it.
    expect(component.money(1100, null)).toBe('1,100');
  });
});
