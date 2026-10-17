import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { wizardPanePath } from 'app/onboarding/wizard.service';
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
  // navigateByUrl as well as navigate since T8: the step-1 trigger opens the wizard's first pane by
  // URL, and a stub missing the method turns a behavioural question into a TypeError in five
  // unrelated cases.
  const router = {
    navigate: jest.fn(() => Promise.resolve(true)),
    navigateByUrl: jest.fn(() => Promise.resolve(true)),
    url: '/dashboard',
  };

  // ONE SPELLING OF THE FAKE, FOR THE WHOLE FILE (backlog items 172 and 200). This file carried TWO
  // byte-identical copies of this arrow, one in each of the last two `describe`s, plus two inline
  // `TestBed.inject(FakeHealthConnectRepository)` reaches above them — so a later change to the
  // helper would have left three of the four spellings behind with nothing failing. Item 172 removed
  // exactly this shape from `patient-directory-page.component.spec.ts`; item 200 found it here.
  //
  // It is declared here, above every block, and that is safe for a reason worth stating rather than
  // re-deriving: this is a LAZY arrow, and it captures NOTHING — `TestBed` and the fake are both
  // module-level imports, so the body is byte-identical to the inline expression it replaced. It
  // resolves `TestBed.inject` when it is CALLED, inside a `beforeEach` or an `it`, after `setUp` has
  // configured (or reset and reconfigured) the module — not where it is written. So the per-block
  // `TestBed.resetTestingModule()` cannot hand it a stale instance. Only an eager
  // `const repository = TestBed.inject(…)` would care about placement, and this is not one.
  const repository = (): FakeHealthConnectRepository => TestBed.inject(FakeHealthConnectRepository);

  /**
   * Every earnings request this page issued, if it issues any — and backlog row 263 is that it
   * issues none.
   *
   * <p>⚠ <b>This helper used to be `earningsRequest()`, an `expectOne` that every test in the file
   * flushed</b>, and the question it answered has been reversed rather than deleted: the card is
   * gone from the dashboard entirely (`dashboard-states.md` § Default View — *"Do not show earnings
   * on dashboard whatsoever"*), so the assertion is now that nothing matches. It is `match` and not
   * `expectNone` because two tests below need to *answer* whatever a regressed component asked for,
   * in order to prove the figures still do not reach the screen; `expectNone` cannot flush.
   *
   * <p>Matched on the path rather than the full adminservice URL so a request re-pointed at some
   * other prefix is still caught. It is the read that must be gone, not one spelling of it.
   */
  const earningsRequests = (): ReturnType<HttpTestingController['match']> =>
    httpMock.match(request => request.url.includes('/api/professionals/me/earnings'));

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
   * is computed, and rendering the real markup drags in the charts and the async-state wrapper. The
   * restriction block at the bottom turns it on, because *the whole of item 125 is what reaches the
   * screen* — a suppression proved only against a signal survives someone deleting the `@if` that
   * acts on it.
   *
   * <p>It used to drag in a `routerLink` as well, which a plain object `Router` cannot serve, and
   * that is why three blocks below refused the earnings read rather than filling it. Row 263 removed
   * the card carrying it, so the rendered template no longer links anywhere.
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
    repository().reset();
    fixture.detectChanges();
    router.navigate.mockClear();
    router.navigateByUrl.mockClear();
  };

  beforeEach(() => setUp());

  afterEach(() => {
    jest.useRealTimers();
    httpMock.verify();
  });

  it('derives demographic and case-status KPI counts from the repository signals', () => {
    flushProgress(true);
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
    component.navigateDemographic('female');
    component.navigateDemographic('kids');
    component.navigateCaseStatus('urgent');

    expect(router.navigate).toHaveBeenNthCalledWith(1, ['/patients'], { queryParams: { gender: 'female' } });
    expect(router.navigate).toHaveBeenNthCalledWith(2, ['/patients'], { queryParams: { children: 'true' } });
    expect(router.navigate).toHaveBeenNthCalledWith(3, ['/cases'], { queryParams: { status: 'urgent' } });
  });

  /**
   * ⭐ <b>Backlog row 263, and the question these two cases ask is the reverse of the one this file
   * used to ask.</b> Three tests stood here — <i>"fills the earnings card from adminservice,
   * monthly"</i>, <i>"leaves the rest of the dashboard working when earnings fail"</i> and
   * <i>"formats money in the current language"</i> — each asserting that the card worked. They are
   * not deleted silently: `dashboard-states.md` § Default View now reads <i>"Do not show earnings on
   * dashboard whatsoever. Remove earnings card."</i>, so the property to hold is that the card and
   * its read are both gone, and the old cases asserted the opposite of the specification.
   *
   * <p><b>Unconditionally, in every state.</b> This is not row 259's welcome-page split — nothing
   * here gates on a status — so the read must be absent for a working clinician as well as for an
   * applicant.
   *
   * <p>⚠ <b>Which is why both cases sign a clinical account in, and the sentence above used to
   * claim that for free.</b> It read <i>"the read must be absent for a fully active clinician too,
   * which is exactly the account the default `setUp` builds"</i>, and `setUp` builds no account at
   * all: the first {@code AccountService.authenticate} in this file is in the redirect block below,
   * so these two ran with {@code account === null} — the *no account has arrived* state. Nothing was
   * broken by it, because the component has no {@code ownEarnings} call site left in any branch and
   * so no state can produce the read. The claim was the defect: row 259 makes this page
   * status-gated, and a reader trusting that sentence would believe the active-clinician branch was
   * pinned when nothing exercised it. Made true rather than softened — it costs one line each.
   *
   * <p><b>"Active" here is account-level and that limit is the honest part of it:</b> a clinical
   * authority with all four step-1 fields filled, which is the most "active" this page can currently
   * be told about. {@code Profile.status} is not a signal the dashboard reads at all yet — row 259
   * is the work that introduces it — so no case here can assert `ACTIVE && ACTIVE`, and one claiming
   * to would be this same defect again.
   *
   * <p>⛔ <b>The request, asserted on the wire, and not only the markup.</b> A template assertion
   * alone passes against a component that still calls adminservice and merely renders nothing with
   * the answer: a cross-stack read nobody looks at, invisible on screen and visible only in a
   * network log. The second case proves the markup, the first proves the call — and
   * `httpMock.verify()` in `afterEach` is a third layer, since an unflushed earnings request now
   * fails every test in the file rather than only the two below.
   */
  it('makes NO earnings request at all — the dashboard no longer reads adminservice (row 263)', () => {
    // A working clinician, not the null account `setUp` leaves behind: the state most likely to be
    // given an earnings read back is the one with earnings to show.
    TestBed.inject(AccountService).authenticate(
      new Account(true, ['ROLE_DOCTOR'], 'a@b.c', 'Ama', 'en', 'Mensah', 'doctor', 'content/path'),
    );
    flushProgress(true);

    // The URLs rather than the `TestRequest`s, and that is not cosmetic: a failing `toEqual([])` on
    // the objects themselves kills the jest worker with "Converting circular structure to JSON"
    // while it serialises the diff, so the suite reports "failed to run" and names nothing. Watched
    // happen on this very assertion before the component was changed. A string list reddens
    // legibly and prints the request it is complaining about.
    expect(earningsRequests().map(request => request.request.urlWithParams)).toEqual([]);
  });

  /**
   * And nothing earnings-shaped reaches the screen even if adminservice would answer with figures.
   *
   * <p>The response is flushed into whatever the component asked for, rather than asserting against
   * an unfed page: a card that renders only once its read returns is absent on an empty test for the
   * wrong reason, and such a test stays green through the whole regression it exists to catch.
   * `match` returns nothing once the call is gone, so the loop simply does not run.
   */
  it('renders no earnings card, even when adminservice answers with figures (row 263)', async () => {
    TestBed.resetTestingModule();
    await setUp({ renderTemplate: true });
    // The same working clinician as the case above, for the same reason: the card is gone from the
    // dashboard somebody with earnings sees, not only from an applicant's.
    TestBed.inject(AccountService).authenticate(
      new Account(true, ['ROLE_DOCTOR'], 'a@b.c', 'Ama', 'en', 'Mensah', 'doctor', 'content/path'),
    );
    flushProgress(true);
    for (const request of earningsRequests()) {
      request.flush({ totalAccrued: 1100, shiftsCompleted: 2, currency: 'GHS' });
    }
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="dashboardEarnings"]')).toBeNull();
    // The copy as well as the hook: a section renamed rather than removed would keep the keys.
    expect(fixture.nativeElement.textContent).not.toContain('healthConnect.earnings.');
    expect(fixture.nativeElement.textContent).not.toContain('1,100');
    // The positive control for this case. The rest of the dashboard is untouched by row 263, so a
    // page that rendered nothing at all would satisfy the three assertions above for nothing.
    expect(fixture.nativeElement.querySelectorAll('hpd-stat-card')).toHaveLength(7);
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
      jest.advanceTimersByTime(2000);
    };

    it('moves an unfinished profile into the wizard after two seconds', () => {
      flushProgress(false);

      settle();

      // The first outstanding pane — pane 1 here, since no account has arrived to say otherwise
      // (T6, re-pointed from the retired tab page's `?tab=` deep link).
      expect(router.navigateByUrl).toHaveBeenCalledWith(wizardPanePath('account'));
    });

    it('does not move before the two seconds are up', () => {
      flushProgress(false);

      jest.advanceTimersByTime(1500);

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('leaves a finished profile alone', () => {
      flushProgress(true);

      settle();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    /** Unknown is not incomplete — bouncing someone whose profile is finished is the worse error. */
    it('leaves the clinician alone when completion could not be determined', () => {
      progressRequest().flush(null, { status: 500, statusText: 'Server Error' });

      settle();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
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
        // The step-1 trigger navigates immediately on the incomplete account — that is its own
        // describe's subject below. Cleared so this assertion is about the nudge alone.
        router.navigateByUrl.mockClear();
        flushProgress(false);

        settle();

        expect(router.navigateByUrl).not.toHaveBeenCalled();
      },
    );

    /** And the applicant it is actually for — ROLE_USER and nothing else — still moves. */
    it('still moves an applicant holding only ROLE_USER', () => {
      TestBed.inject(AccountService).authenticate(new Account(true, ['ROLE_USER'], '', null, 'en', null, 'applicant', null));
      // Drop the step-1 trigger's own immediate navigation; the two-second nudge is the subject.
      router.navigateByUrl.mockClear();
      flushProgress(false);

      settle();

      expect(router.navigateByUrl).toHaveBeenCalledWith(wizardPanePath('account'));
    });

    it('does not yank someone who has already navigated away', () => {
      flushProgress(false);
      router.url = '/patients';

      settle();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      router.url = '/dashboard';
    });

    it('cancels the timer when the dashboard is destroyed', () => {
      flushProgress(false);

      fixture.destroy();
      jest.advanceTimersByTime(2000);

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    /**
     * ⚠ **A fifth condition since T8.** The wizard's panes are children of this route, so
     * `router.url.startsWith('/dashboard')` is *true* inside them — which was the old test — and
     * this timer would have pulled an applicant out of the pane they are in, two seconds after it
     * opened. Same failure as "already navigated away", one level down.
     */
    it('does not yank someone out of an open wizard pane', () => {
      TestBed.inject(AccountService).authenticate(new Account(true, ['ROLE_USER'], '', null, 'en', null, 'applicant', null));
      flushProgress(false);
      router.url = wizardPanePath('account');
      // Drop the step-1 trigger's own immediate navigation (it fired while still on /dashboard);
      // the two-second nudge is the subject.
      router.navigateByUrl.mockClear();

      settle();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      router.url = '/dashboard';
    });
  });

  /**
   * ⭐ **Step 1's trigger** — `profile.md:171-173`: *"if any of the account's `firstName`,
   * `lastName`, `langKey` or `imageUrl` is empty, open the User update dialog over the dashboard."*
   */
  describe('the step-1 dialog trigger', () => {
    const signIn = (account: Account): void => {
      TestBed.inject(AccountService).authenticate(account);
      flushProgress(true);
    };

    /** Immediately, not after a beat: a dialog that appears two seconds in reads as a fault. */
    it('opens the account pane at once when a field is missing', () => {
      signIn(new Account(true, ['ROLE_USER'], 'a@b.c', null, 'en', 'Mensah', 'applicant', 'content/path'));

      expect(router.navigateByUrl).toHaveBeenCalledWith(wizardPanePath('account'));
    });

    /**
     * ⛔ **`imageUrl` is one of the four**, which is what made the dialog reopen for ever before
     * `backlog.md` row 232 built the avatar upload. It is in the trigger because the form can now
     * satisfy it.
     */
    it('opens the account pane when only the avatar is missing', () => {
      signIn(new Account(true, ['ROLE_USER'], 'a@b.c', 'Ama', 'en', 'Mensah', 'applicant', null));

      expect(router.navigateByUrl).toHaveBeenCalledWith(wizardPanePath('account'));
    });

    it('leaves a complete account alone', () => {
      signIn(new Account(true, ['ROLE_DOCTOR'], 'a@b.c', 'Ama', 'en', 'Mensah', 'doctor', 'content/path'));

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    /** Unknown is not incomplete — opening a dialog on an unknown account opens it over everybody. */
    it('opens nothing while no account has arrived', () => {
      flushProgress(true);

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    /** Someone already inside a pane has been taken somewhere; re-navigating is yanking them back. */
    it('does not reopen pane 1 over a pane the reader has already moved to', () => {
      router.url = wizardPanePath('documents');

      signIn(new Account(true, ['ROLE_USER'], 'a@b.c', null, 'en', null, 'applicant', null));

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      router.url = '/dashboard';
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
      repository().setDirectoryRestrictions(parts);
      fixture.detectChanges();
    };

    beforeEach(async () => {
      TestBed.resetTestingModule();
      await setUp({ renderTemplate: true });
      flushProgress(true);
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

      // The case cards and the charts come from a read this header says nothing about. Hiding the
      // dashboard over a refusal that cost four numbers would remove more truth than it removes
      // falsehood. (The earnings card was a third example here until row 263 removed it.)
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

    beforeEach(async () => {
      TestBed.resetTestingModule();
      await setUp({ renderTemplate: true });
      flushProgress(true);
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

    it('prints no number before a read has answered, which the guard claims and nothing pinned', () => {
      // `countable` is a POSITIVE test on 'ready', and its comment calls excluding `idle` "the
      // deliberate half". Nothing asserted it: review found that `countable = ready || idle` survives
      // the whole suite. `idle` is unreachable in practice — the repository's constructor calls
      // loadAll(), which sets both reads to `loading` before first render — but a claimed property
      // with no test is how the thing this row fixes got in. The wrapper cannot help here: its own
      // content branch is `ready || idle`, so on `idle` it PROJECTS, and the model guard is the only
      // thing between an unanswered read and a tile reading 0.
      repository().setReadState('caseQueue', { status: 'idle', error: null });
      fixture.detectChanges();

      expect(component.caseCards()).toEqual([]);
      expect(tilesIn('case-status')).toHaveLength(0);
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
