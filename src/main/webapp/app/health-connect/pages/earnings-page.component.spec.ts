import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import LineChartComponent from '../charts/line-chart.component';
import EarningsPageComponent from './earnings-page.component';

describe('EarningsPageComponent', () => {
  let component: EarningsPageComponent;
  let fixture: ComponentFixture<EarningsPageComponent>;
  let httpMock: HttpTestingController;

  const earningsRequest = (): ReturnType<HttpTestingController['expectOne']> =>
    httpMock.expectOne(request => request.url.endsWith('/api/professionals/me/earnings'));
  const shiftsRequest = (): ReturnType<HttpTestingController['expectOne']> =>
    httpMock.expectOne(request => request.url.endsWith('/api/professionals/me/shifts'));

  const summary = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    professionalId: 'p1',
    professionalName: 'Ama Boateng',
    role: 'DOCTOR',
    granularity: 'MONTHLY',
    from: '2026-08-01',
    to: '2026-08-17',
    shiftsCompleted: 2,
    totalAccrued: 1100,
    unpricedShifts: 0,
    currency: 'GHS',
    archived: false,
    buckets: [{ periodStart: '2026-08-01', periodEnd: '2026-08-17', shifts: 2, amount: 1100 }],
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EarningsPageComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(EarningsPageComponent, { set: { template: '' } })
      .compileComponents();
    fixture = TestBed.createComponent(EarningsPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('loads the caller-scoped earnings and roster on init', () => {
    earningsRequest().flush(summary());
    shiftsRequest().flush([{ date: '2026-08-15', shift: 'DAY', payable: true }]);

    expect(component.earnings()).toEqual(expect.objectContaining({ totalAccrued: 1100 }));
    expect(component.shifts()).toHaveLength(1);
    expect(component.loading()).toBe(false);
  });

  it('plots one chart point per bucket, keyed on the period start', () => {
    earningsRequest().flush(
      summary({
        buckets: [
          { periodStart: '2026-07-01', periodEnd: '2026-07-31', shifts: 0, amount: 0 },
          { periodStart: '2026-08-01', periodEnd: '2026-08-17', shifts: 2, amount: 1100 },
        ],
      }),
    );
    shiftsRequest().flush([]);

    expect(component.seriesPoints()).toEqual([
      { x: '2026-07-01', y: 0 },
      { x: '2026-08-01', y: 1100 },
    ]);
  });

  /**
   * The window is read off the response, never echoed from the request. A shift is payable only
   * once the day is over, so the server clips the end at yesterday — a chart captioned with the
   * requested range would name dates its own figures exclude.
   */
  it('labels the window from the response, not from what was asked for', () => {
    earningsRequest().flush(summary({ from: '2026-08-01', to: '2026-08-17' }));
    shiftsRequest().flush([]);

    expect(component.windowLabel()).toBe('1 Aug 2026 – 17 Aug 2026');
  });

  it('refetches when the granularity changes, and not when it is reselected', () => {
    earningsRequest().flush(summary());
    shiftsRequest().flush([]);

    component.selectGranularity('WEEKLY');
    const weekly = earningsRequest();
    expect(weekly.request.params.get('granularity')).toBe('WEEKLY');
    weekly.flush(summary({ granularity: 'WEEKLY' }));

    // Already selected: no second request, which httpMock.verify() would flag.
    component.selectGranularity('WEEKLY');
    expect(component.granularity()).toBe('WEEKLY');
  });

  /**
   * "No rate was ever configured" and "you earned nothing" are the same total. The count of
   * unpriced shifts is what separates them, so it has to survive to the template.
   */
  it('keeps the unpriced-shift count, which is what distinguishes unpaid from unpriced', () => {
    earningsRequest().flush(summary({ shiftsCompleted: 3, totalAccrued: 0, unpricedShifts: 3, currency: null }));
    shiftsRequest().flush([]);

    expect(component.earnings()?.unpricedShifts).toBe(3);
    expect(component.money(0, null)).toBe('0');
  });

  /** An account with no clinical record yet is a state, not a failure, and must not read as one. */
  it('shows the no-record state on 404 rather than the error state', () => {
    earningsRequest().flush(null, { status: 404, statusText: 'Not Found' });
    shiftsRequest().flush(null, { status: 404, statusText: 'Not Found' });

    expect(component.unavailable()).toBe(true);
    expect(component.failed()).toBe(false);
    expect(component.loading()).toBe(false);
  });

  it('shows the error state when adminservice is actually broken', () => {
    earningsRequest().flush(null, { status: 503, statusText: 'Service Unavailable' });
    shiftsRequest().flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(component.failed()).toBe(true);
    expect(component.unavailable()).toBe(false);
  });

  /** The roster keeps its unpaid rows: a schedule with the off days removed is not a schedule. */
  it('keeps off days and future shifts in the roster, as the server flagged them', () => {
    earningsRequest().flush(summary());
    shiftsRequest().flush([
      { date: '2026-08-15', shift: 'DAY', payable: true },
      { date: '2026-08-16', shift: 'OFF', payable: false },
      { date: '2026-08-20', shift: 'NIGHT', payable: false },
    ]);

    expect(component.shifts().map(shift => shift.payable)).toEqual([true, false, false]);
  });

  /**
   * ⭐ <b>The positive control for backlog row 263, and the only rendered case in this file.</b>
   *
   * <p>Row 263 removed the earnings card from the dashboard and the adminservice read behind it.
   * Every other assertion about that change is a negative — no request, no `data-cy`, no copy — and
   * a suite of negatives passes identically whether earnings were removed from one screen or broken
   * everywhere. This is the case that tells those two apart: `/earnings` is the surface the
   * specification keeps (`dashboard-states.md` § Sidebar State lists Earnings under <b>Show</b>),
   * and it must still put real figures on a real screen.
   *
   * <p>Rendered for real rather than asserted against the model, unlike every case above, which all
   * run with the template overridden to the empty string. A model-level control cannot see a
   * template that stopped rendering — and the catalogue keys the dashboard card shared with this
   * page are exactly what an over-eager removal would take out from under it.
   *
   * <p>The chart is stubbed and only the chart: `ng2-charts` asks jsdom for a 2D canvas context,
   * gets null and dies reading `.id` off it — a limitation of the test DOM with nothing to do with
   * this page.
   */
  it('STILL renders its own figures on the earnings page itself (row 263 positive control)', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [EarningsPageComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(LineChartComponent, { set: { template: '' } })
      .compileComponents();
    fixture = TestBed.createComponent(EarningsPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    earningsRequest().flush(summary());
    shiftsRequest().flush([{ date: '2026-08-15', shift: 'DAY', payable: true }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="earningsSummary"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="earningsTotal"]')?.textContent).toContain('1,100');
    // The two keys this page shares with the retired dashboard card, named rather than implied:
    // `title` is also the route's titleKey, and removing it with the card would blank this heading.
    expect(fixture.nativeElement.textContent).toContain('healthConnect.earnings.title');
    expect(fixture.nativeElement.textContent).toContain('healthConnect.earnings.totalAccrued');
  });
});
