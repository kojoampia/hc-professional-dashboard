import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { FakeHealthConnectRepository } from '../testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import { RestrictedPart } from '../api/restricted-parts';
import GroupedBarChartComponent from '../charts/grouped-bar-chart.component';
import LineChartComponent from '../charts/line-chart.component';
import PieChartComponent from '../charts/pie-chart.component';
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

  /**
   * Builds the component.
   *
   * <p>`renderTemplate` is off by default and that is not an oversight: most of what this page does
   * is computed, and rendering the real markup drags in the charts, the async-state wrapper and a
   * `routerLink` that a plain object `Router` cannot serve. The restriction block at the bottom
   * turns it on, because *the whole of item 125 is what reaches the screen* — a suppression proved
   * only against a signal survives someone deleting the `@if` that acts on it.
   */
  const setUp = async (options: { renderTemplate?: boolean } = {}): Promise<void> => {
    // Installed before the component exists: ngOnInit schedules the incomplete-profile timer, and a
    // timer registered against the real clock cannot be advanced by jest.advanceTimersByTime later.
    jest.useFakeTimers();
    const testBed = TestBed.configureTestingModule({
      imports: [DashboardPageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository },
        { provide: Router, useValue: router },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    if (options.renderTemplate) {
      // The three charts, and only the three charts. `ng2-charts` asks jsdom for a 2D canvas
      // context, gets null, and dies reading `.id` off it — a limitation of the test DOM that has
      // nothing to do with this page. Their host elements still render, so "the charts are still
      // there" remains an assertion about the dashboard's own markup.
      for (const chart of [GroupedBarChartComponent, LineChartComponent, PieChartComponent]) {
        testBed.overrideComponent(chart, { set: { template: '' } });
      }
    } else {
      testBed.overrideComponent(DashboardPageComponent, { set: { template: '' } });
    }
    await testBed.compileComponents();
    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(FakeHealthConnectRepository).reset();
    fixture.detectChanges();
    router.navigate.mockClear();
  };

  beforeEach(() => setUp());

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

    /**
     * The regression this guard exists for, and it reached production-adjacent quality before a
     * browser caught it: `/api/onboarding/progress` answers `complete: false` at 0% for an account
     * with **no application at all**, which is every clinician seeded or invited rather than hired
     * through the careers page. Keyed on completion alone, the nudge fired on all of them and a
     * ROLE_DOCTOR bounced off the dashboard two seconds after every arrival.
     *
     * <p>Each clinical authority is checked, not just one: the rule is "holds anything beyond a
     * bare ROLE_USER", and `resolveAuthorityRole` returns USER rather than null for that account,
     * so a null check here would silently match nobody.
     */
    it.each([['ROLE_DOCTOR'], ['ROLE_NURSE'], ['ROLE_CARER'], ['ROLE_ADMIN']])(
      'leaves a clinician holding %s alone, however incomplete their application',
      authority => {
        TestBed.inject(AccountService).authenticate(new Account(true, [authority, 'ROLE_USER'], '', null, 'en', null, 'someone', null));
        flushProgress(false);

        settle();

        expect(router.navigate).not.toHaveBeenCalled();
      },
    );

    /** And the applicant it is actually for — ROLE_USER and nothing else — still moves. */
    it('still moves an applicant holding only ROLE_USER', () => {
      TestBed.inject(AccountService).authenticate(new Account(true, ['ROLE_USER'], '', null, 'en', null, 'applicant', null));
      flushProgress(false);

      settle();

      expect(router.navigate).toHaveBeenCalledWith(['/account/profile'], { queryParams: { tab: 'application' } });
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

  /**
   * Backlog item 125. These four cards count the patient directory, and `caseAssignments` means the
   * directory arrived short of rows — so every figure is lower than the truth, by an amount nothing
   * on this screen can state, and is rendered exactly as a correct one is.
   *
   * <p>The three cases are mutated **separately**, because the whole decision is that they are not
   * the same case: no header must leave the dashboard untouched (the positive control — five of the
   * eight disciplines see it), `lastActivity` must leave the figures alone, and only
   * `caseAssignments` suppresses. A single "restricted" test would pass on a treatment that fired
   * on all three, which is the defect pointing the other way.
   *
   * <p>Rendered for real here, unlike the specs above: a suppression proved only against a signal
   * stays green when the `@if` acting on it is deleted.
   */
  describe('X-Restricted-Parts and the demographic cards (backlog item 125)', () => {
    const notice = (): Element | null => fixture.nativeElement.querySelector('[data-cy="restrictedDemographics"]');
    const statCards = (): NodeListOf<Element> => fixture.nativeElement.querySelectorAll('hpd-stat-card');
    /**
     * Every notice's sentence, in order. The `span`, not the element: `mat-icon` renders its
     * ligature name as text, so the whole element's `textContent` carries `report_problem` too.
     */
    const noticeTexts = (): readonly (string | undefined)[] =>
      Array.from(fixture.nativeElement.querySelectorAll('[data-cy="restrictedDemographics"] span')).map(
        span => (span as Element).textContent?.trim(),
      );

    const restrict = (...parts: RestrictedPart[]): void => {
      TestBed.inject(FakeHealthConnectRepository).setDirectoryRestrictions(parts);
      fixture.detectChanges();
    };

    beforeEach(async () => {
      TestBed.resetTestingModule();
      await setUp({ renderTemplate: true });
      flushProgress(true);
      // Refused rather than filled: the earnings card is the one part of this template carrying a
      // `routerLink`, and a plain object `Router` cannot serve one. Its absence is the state the
      // "leaves the rest of the dashboard alone" claim is made against, not a state being asserted.
      earningsRequest().flush(null, { status: 503, statusText: 'unavailable' });
      fixture.detectChanges();
    });

    it('counts exactly as it always did when the response carried no header', () => {
      // The positive control. A treatment that fired on an unrestricted read would withhold four
      // correct figures from every clinician in the estate — the same defect, inverted.
      expect(notice()).toBeNull();
      expect(component.demographicCards()).toEqual([
        expect.objectContaining({ id: 'patients', count: 7 }),
        expect.objectContaining({ id: 'female', count: 3 }),
        expect.objectContaining({ id: 'male', count: 4 }),
        expect.objectContaining({ id: 'kids', count: 2 }),
      ]);
      expect(statCards()).toHaveLength(7);
    });

    it('leaves every figure alone when only the activity log was withheld', () => {
      // Item 112's argument, client-side: no card derives from the field `lastActivity` blanks, so
      // there was never a partial number to protect and suppressing would withhold four correct
      // figures for nothing.
      //
      // Asserted as *equality with the unrestricted figures* rather than by restating today's four
      // counts, which is what makes it survive a fifth card: the fake blanks `lastActivityAt` on
      // every row under this refusal, as the service does, so a card derived from that field would
      // compute differently in the two runs and this would redden. A rule justified on today's
      // field list would simply rot.
      const unrestricted = component.demographicCards();

      restrict('lastActivity');

      expect(component.demographicCards()).toEqual(unrestricted);
      expect(notice()).toBeNull();
      expect(statCards()).toHaveLength(7);
    });

    it('shows no figure at all, and says why, when rows were withheld', () => {
      restrict('caseAssignments');

      // Empty in the model, not merely hidden: a later caller reading this signal gets no figure
      // rather than a confidently short one.
      expect(component.demographicCards()).toEqual([]);
      expect(notice()).not.toBeNull();
      // Its own sentence, not the directory banner's. There the list in front of the clinician is
      // short; here there is no figure at all, and the list's words would describe neither.
      expect(notice()?.querySelector('span')?.textContent?.trim()).toBe('healthConnect.dashboard.restricted.caseAssignments');
    });

    it('suppresses the four counts and nothing else on the page', () => {
      restrict('caseAssignments');

      // The case cards, the charts and the earnings card come from reads this header says nothing
      // about. Hiding the dashboard over a refusal that cost four numbers would remove more truth
      // than it removes falsehood.
      expect(component.caseCards()).toEqual([
        expect.objectContaining({ id: 'urgent', count: 2 }),
        expect.objectContaining({ id: 'open', count: 2 }),
        expect.objectContaining({ id: 'closed', count: 3 }),
      ]);
      expect(statCards()).toHaveLength(3);
      expect(fixture.nativeElement.querySelector('hpd-pie-chart')).not.toBeNull();
    });

    it('says it once when both parts were refused, and says nothing about the activity log', () => {
      // The technician case, as measured on quality: `caseAssignments,lastActivity`. The dashboard
      // has no treatment for the second part and must not grow one — no card reads the field it
      // blanks, so a notice about it here would report a loss this screen did not suffer.
      restrict('caseAssignments', 'lastActivity');

      expect(component.demographicCards()).toEqual([]);
      expect(fixture.nativeElement.querySelectorAll('[data-cy^="restricted"]')).toHaveLength(1);
    });

    it('withholds the figures for a token it cannot name, without naming it', () => {
      // Fail-open is right for "what do I print" and backwards for "may I assert this number", and
      // this is the second question. `api/` may name a third ROW-REMOVING part on a release this
      // bundle predates — its enum is still growing, and the repos ship as independently tagged
      // images, so web-older-than-api is structural — and a bundle that drops that token silently
      // goes on publishing four short figures.
      //
      // Suppress, and say something generic. The token itself still reaches no screen, which is
      // item 114's rule and is untouched.
      restrict('medications' as RestrictedPart);

      expect(component.demographicCards()).toEqual([]);
      expect(notice()?.querySelector('span')?.textContent?.trim()).toBe('healthConnect.dashboard.restricted.unknown');
      expect(fixture.nativeElement.textContent).not.toContain('medications');
    });

    it('names the part it could name, and says separately that one could not be named', () => {
      // Two sentences, because a reader can act on them differently: a refused role is permanent
      // and expected, an unrecognised part means this bundle is older than the service answering it.
      restrict('caseAssignments', 'medications' as RestrictedPart);

      expect(component.demographicCards()).toEqual([]);
      expect(noticeTexts()).toEqual(['healthConnect.dashboard.restricted.caseAssignments', 'healthConnect.dashboard.restricted.unknown']);
    });
  });

  describe('one read per state (backlog item 146)', () => {
    // The third surface the shared signal reached. These charts are a pure function of the cached
    // cases, so the case read is the one that describes them — and a failed read of the directory,
    // or of one patient's record, must leave them alone.
    const charts = (): Element | null => fixture.nativeElement.querySelector('hpd-pie-chart');
    const retryButton = (): Element | null =>
      Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<Element>).find(
        button => button.textContent?.includes('healthConnect.actions.retry'),
      ) ?? null;
    const repository = (): FakeHealthConnectRepository => TestBed.inject(FakeHealthConnectRepository);

    beforeEach(async () => {
      TestBed.resetTestingModule();
      await setUp({ renderTemplate: true });
      flushProgress(true);
      // Refused for the reason the restriction block above refuses it: the earnings card is the one
      // part of this template carrying a routerLink, which a plain object Router cannot serve.
      earningsRequest().flush(null, { status: 503, statusText: 'unavailable' });
      fixture.detectChanges();
    });

    it('KEEPS ITS CHARTS when the patient-directory read fails', () => {
      repository().setReadState('directory', { status: 'error', error: 'healthConnect.states.error' });
      fixture.detectChanges();

      expect(charts()).not.toBeNull();
    });

    it('keeps its charts when one patient’s record read fails — a page nobody opened it from', () => {
      // Opening a patient whose record 503'd used to blank this page, which the clinician was not
      // even looking at, along with the directory and the case queue.
      repository().setRecordState('patient-ama', { status: 'error', error: 'healthConnect.states.error' });
      fixture.detectChanges();

      expect(charts()).not.toBeNull();
    });

    it('reports a refused case read as a refusal, without a Retry', () => {
      repository().setReadState('caseQueue', { status: 'forbidden', error: 'healthConnect.states.forbidden' });
      fixture.detectChanges();

      expect(charts()).toBeNull();
      expect(retryButton()).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-cy="asyncForbidden"]')).not.toBeNull();
    });

    it('STILL blanks the charts, with a Retry, when the case read genuinely failed', () => {
      repository().setReadState('caseQueue', { status: 'error', error: 'healthConnect.states.error' });
      fixture.detectChanges();

      expect(charts()).toBeNull();
      expect(retryButton()).not.toBeNull();
    });
  });

  /**
   * Backlog item 165. The two stat rows render from the caches, and until this item they rendered
   * whatever the caches held however the read that fills them had gone — so a technician, refused
   * the case collection by hc-patient on every load, read URGENT 0 · OPEN 0 · CLOSED 0 directly
   * above a panel saying their role has no access to case data. The page contradicted itself twice
   * on one screen.
   *
   * <p><b>Three states, asserted separately, because two would not be enough.</b> "Never print a
   * number" passes a test that only checks the refusal — and would be this same defect inverted,
   * since a technician may genuinely have no open cases and is entitled to read that zero. So the
   * genuine zero is its own test, and the outage is a third: a refusal offers no Retry and a failure
   * must go on offering one.
   *
   * <p>Rendered for real, like the item 125 block above and for its reason: a suppression proved
   * only against a signal survives someone deleting the wrapper that acts on it, and a wrapper
   * proved alone survives someone restoring the count to the signal.
   */
  describe('a read that did not answer prints no total (backlog item 165)', () => {
    const repository = (): FakeHealthConnectRepository => TestBed.inject(FakeHealthConnectRepository);
    /**
     * The tiles of one section, by the heading each section is labelled by.
     *
     * <p>Scoped rather than counted across the page: the whole claim is that one read's failure
     * leaves the *other* read's tiles standing, and a count of every `hpd-stat-card` on the
     * dashboard cannot tell four-and-none from none-and-three.
     */
    const tilesIn = (section: 'demographics' | 'case-status'): NodeListOf<Element> =>
      fixture.nativeElement.querySelectorAll(`[aria-labelledby="hpd-dashboard-${section}"] hpd-stat-card`);
    const textIn = (section: 'demographics' | 'case-status'): string =>
      fixture.nativeElement.querySelector(`[aria-labelledby="hpd-dashboard-${section}"]`)?.textContent ?? '';
    const retryButtonIn = (section: 'demographics' | 'case-status'): Element | null =>
      Array.from(fixture.nativeElement.querySelectorAll(`[aria-labelledby="hpd-dashboard-${section}"] button`) as NodeListOf<Element>).find(
        button => button.textContent?.includes('healthConnect.actions.retry'),
      ) ?? null;

    beforeEach(async () => {
      TestBed.resetTestingModule();
      await setUp({ renderTemplate: true });
      flushProgress(true);
      // Refused for the reason the two blocks above refuse it: the earnings card is the one part of
      // this template carrying a routerLink, which a plain object Router cannot serve.
      earningsRequest().flush(null, { status: 503, statusText: 'unavailable' });
      fixture.detectChanges();
    });

    it('prints its three case totals when the case read answered', () => {
      // The positive control. A treatment that fired on a healthy read would withhold three correct
      // figures from every clinician in the estate.
      expect(component.caseCards()).toHaveLength(3);
      expect(tilesIn('case-status')).toHaveLength(3);
      expect(tilesIn('demographics')).toHaveLength(4);
    });

    it('prints NO case total when the case read was refused, and says why instead', () => {
      repository().setReadState('caseQueue', { status: 'forbidden', error: 'healthConnect.states.forbidden' });
      fixture.detectChanges();

      // Empty in the model, not merely hidden: a later caller reading this signal gets no figure
      // rather than a confidently wrong one.
      expect(component.caseCards()).toEqual([]);
      expect(tilesIn('case-status')).toHaveLength(0);
      // Its own sentence, naming what is missing. The charts below carry the generic refusal, which
      // over an absent stat row would say nothing about which figures went.
      expect(textIn('case-status')).toContain('healthConnect.dashboard.refused.caseCounts');
      // A refusal is a decision, not an outage: retrying re-issues the same 403 for ever.
      expect(retryButtonIn('case-status')).toBeNull();
    });

    it('STILL prints 0 when the caller genuinely has no cases', () => {
      // The inverse, and the reason "never print a number" is not the fix. This read ANSWERED; the
      // answer is that there is nothing in it, and the clinician is entitled to read that zero the
      // same way a doctor reads a correct 12.
      for (const row of [...repository().caseQueue()]) {
        repository().archiveCase(row.id, 'emptied for this test');
      }
      fixture.detectChanges();

      expect(component.caseCards()).toEqual([
        expect.objectContaining({ id: 'urgent', count: 0 }),
        expect.objectContaining({ id: 'open', count: 0 }),
        expect.objectContaining({ id: 'closed', count: 0 }),
      ]);
      expect(tilesIn('case-status')).toHaveLength(3);
      expect(textIn('case-status')).not.toContain('healthConnect.dashboard.refused');
    });

    it('tells an outage apart from a refusal, and keeps the Retry a failure deserves', () => {
      repository().setReadState('caseQueue', { status: 'error', error: 'healthConnect.states.error' });
      fixture.detectChanges();

      // No number either — a failed read leaves the cache holding the last response or nothing at
      // all, and neither is a total.
      expect(component.caseCards()).toEqual([]);
      expect(tilesIn('case-status')).toHaveLength(0);
      // But it is NOT the refusal sentence, and it does offer the Retry that may fix it.
      expect(textIn('case-status')).not.toContain('healthConnect.dashboard.refused.caseCounts');
      expect(textIn('case-status')).toContain('healthConnect.states.error');
      expect(retryButtonIn('case-status')).not.toBeNull();
    });

    it('prints no patient total when the DIRECTORY read was refused, and says why instead', () => {
      // The same defect on the other stat row. Item 125 covered a directory served short of rows;
      // a refused read carries no header to be short in, so its four figures counted an empty cache.
      repository().setReadState('directory', { status: 'forbidden', error: 'healthConnect.states.forbidden' });
      fixture.detectChanges();

      expect(component.demographicCards()).toEqual([]);
      expect(tilesIn('demographics')).toHaveLength(0);
      expect(textIn('demographics')).toContain('healthConnect.dashboard.refused.patientCounts');
      expect(retryButtonIn('demographics')).toBeNull();
    });

    it('leaves item 125 to say it when the directory answered SHORT rather than not at all', () => {
      // The two facts must not collapse into one sentence. A read served short of rows still
      // answered, so the restriction notice is what belongs there — not the refusal sentence, which
      // would claim the list was never read.
      repository().setDirectoryRestrictions(['caseAssignments']);
      fixture.detectChanges();

      expect(component.demographicCards()).toEqual([]);
      expect(fixture.nativeElement.querySelector('[data-cy="restrictedDemographics"]')).not.toBeNull();
      expect(textIn('demographics')).toContain('healthConnect.dashboard.restricted.caseAssignments');
      expect(textIn('demographics')).not.toContain('healthConnect.dashboard.refused.patientCounts');
    });

    it('suppresses only the row whose own read went wrong', () => {
      // The isolation item 146 bought, at this surface. A refused case read costs the case totals
      // and the charts; the demographic totals come from a read that answered, and hiding them
      // would remove more truth than falsehood.
      repository().setReadState('caseQueue', { status: 'forbidden', error: 'healthConnect.states.forbidden' });
      fixture.detectChanges();

      expect(tilesIn('demographics')).toHaveLength(4);
      expect(component.demographicCards()).toHaveLength(4);
    });

    it('suppresses only the row whose own read went wrong, the other way round', () => {
      repository().setReadState('directory', { status: 'error', error: 'healthConnect.states.error' });
      fixture.detectChanges();

      expect(tilesIn('case-status')).toHaveLength(3);
      expect(component.caseCards()).toHaveLength(3);
    });
  });
});
