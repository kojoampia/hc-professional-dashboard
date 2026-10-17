import { ChangeDetectionStrategy, Component, OnInit, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MatIconModule } from '@angular/material/icon';

import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import { ROW_REMOVING_PARTS } from '../api/restricted-parts';
import GroupedBarChartComponent from '../charts/grouped-bar-chart.component';
import LineChartComponent from '../charts/line-chart.component';
import PieChartComponent from '../charts/pie-chart.component';
import { AsyncViewState, CaseStatus } from '../health-connect.models';
import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { WizardService, wizardPanePath } from 'app/onboarding/wizard.service';
import { hasClinicalAuthority } from '../authority-role';
import StatCardRowComponent, { StatCard } from '../../shared/health-connect/stat-card/stat-card-row.component';
import AsyncStateComponent from '../../shared/health-connect/async-state/async-state.component';

/**
 * The beat between landing on the dashboard and being moved to the profile. Long enough that the
 * move reads as deliberate, short enough that nobody starts reading.
 */
const INCOMPLETE_PROFILE_REDIRECT_MS = 2000;

/**
 * Whether a read answered with something a total may be counted from (backlog item 165).
 *
 * <p><b>`ready` and nothing else, and the omission of `idle` is the deliberate half.</b> A read
 * nobody has made yet holds an empty cache, and counting one is the same fabricated emptiness the
 * record page was taught to stop reporting in item 146 — `idle` is not "ready with nothing in it".
 * `loading` counts the previous response or nothing at all, `error` counts whatever survived a read
 * that failed, and `forbidden` counts a read that was never served.
 *
 * <p>Written as a positive test on one member rather than as a list of the states to exclude, so it
 * <b>fails closed</b>: a sixth `AsyncStatus` withholds a figure until somebody decides a figure may
 * be stated from it, which is the direction `<hpd-async-state>`'s own final branch chose for the
 * same reason. A negative list would admit it silently, and the thing a status nobody has considered
 * cannot be evidence of is a correct total.
 */
const countable = (state: AsyncViewState): boolean => state.status === 'ready';

@Component({
  standalone: true,
  selector: 'hpd-dashboard-page',
  imports: [
    AsyncStateComponent,
    GroupedBarChartComponent,
    LineChartComponent,
    MatIconModule,
    PieChartComponent,
    RouterOutlet,
    StatCardRowComponent,
    TranslateModule,
  ],
  template: `
    <main class="w-full space-y-6 px-4 py-8 md:px-8">
      <h1 class="sr-only">{{ 'healthConnect.navigation.dashboard' | translate }}</h1>

      <section aria-labelledby="hpd-dashboard-demographics">
        <h2 id="hpd-dashboard-demographics" class="sr-only">{{ 'healthConnect.dashboard.demographics' | translate }}</h2>
        <!--
          THE DIRECTORY READ, because that is what the four cards inside are counted from (item 165).

          These tiles rendered from the cache whatever had happened to the read that fills it, so a
          refused directory printed PATIENTS 0 · FEMALE 0 · MALE 0 · KIDS 0 — four numbers asserting
          emptiness about a read that was never answered. Item 125 suppressed them for a read served
          SHORT of rows; this wrapper suppresses them for a read not served at all. The two are
          different facts and both are now said: the restricted.* sentences for the first, the
          refused.* ones for the second, which is why the notices below stay inside the projected
          content and only a ready read reaches them.

          NO BACKTICKS ANYWHERE IN THESE COMMENTS. They sit inside the component's template literal,
          so one of them ends the string — the compiler then reports a missing comma on a line of
          prose, several lines further down.

          empty is bound false on purpose. A caller with genuinely no patients must still read 0 —
          that is the honest number, and "nothing to show" over a stat row would be this row's
          defect pointing the other way.
        -->
        <hpd-async-state
          [status]="repository.directoryState().status"
          [empty]="false"
          forbiddenKey="healthConnect.dashboard.refused.patientCounts"
          (retry)="repository.reset()"
        >
          <!--
            The whole of backlog item 125. These four cards count the directory, and a
            caseAssignments refusal takes patients out of it — so every figure would be lower than
            the truth, by an amount nothing here can state, and rendered exactly as a correct one is.

            In place of the cards, not beside them. A marker on a card leaves the number being read,
            and on a stat card the number is the loudest thing on screen; these are also links into a
            filtered directory, so the figure is a promise about what the click leads to as well. The
            sentence is this screen's own, not the directory banner's: there the list is short, here
            there is no figure at all. Everything else on the dashboard is untouched — the case
            cards and the charts come from a read this header says nothing about.

            Keeping the tiles with an em dash in place of each number was considered and dropped: it
            asserts nothing, which is right, but four dashed tiles read as a broken widget rather
            than as a refusal, StatCard.count has no non-numeric state to put there, and the sentence
            still has to go somewhere. Losing the shortcut into the directory costs little — that
            page carries its own gender select and children checkbox.

            The @if exists for the @else below; the @for would render nothing on its own.
          -->
          @if (demographicsRestricted()) {
            @for (noticeKey of demographicRestrictionNotices(); track noticeKey) {
              <p
                class="flex items-start gap-2 rounded-hpd-sm bg-hpd-warning-tint px-4 py-3 text-sm text-hpd-warning"
                role="status"
                data-cy="restrictedDemographics"
              >
                <mat-icon class="!h-5 !w-5 shrink-0 !text-[20px]" aria-hidden="true">report_problem</mat-icon>
                <span>{{ noticeKey | translate }}</span>
              </p>
            }
          } @else {
            <hpd-stat-card-row [cards]="demographicCards()" (selected)="navigateDemographic($event)" />
          }
        </hpd-async-state>
      </section>

      <section aria-labelledby="hpd-dashboard-case-status">
        <h2 id="hpd-dashboard-case-status" class="sr-only">{{ 'healthConnect.dashboard.caseStatus' | translate }}</h2>
        <!--
          THE CASE READ, and the whole of backlog item 165. hc-patient refuses a technician the case
          collection on every load, and these three tiles sat outside every wrapper: the page said
          "you are not permitted to read case assignments" at the top, then URGENT 0 · OPEN 0 ·
          CLOSED 0, then — from the charts below — "your role does not give you access to this
          information". Three zeros between two sentences denying them.

          The same wrapper as the charts, bound to the same state, rather than a second notion of
          refusal: caseQueueState() already discriminates 403 from everything else (item 146), and
          a bespoke @if here would be a second rendering of five statuses that nothing holds to the
          set. It also fails closed — a status this bundle does not know renders a failure rather
          than the tiles.

          TWO WRAPPERS ON ONE READ, deliberately, and the alternative was rejected on layout. Moving
          these tiles inside the charts wrapper below would say it once, and would move the second
          row of KPI tiles down the page — a change to the dashboard nobody asked for. (It used to
          land them underneath the earnings card; row 263 removed that card, and the layout argument
          survives it: the tiles still belong above the charts rather than inside their wrapper.) So
          the tiles carry their own sentence, naming what is missing (refused.caseCounts), and the
          charts keep the generic one; under an outage both say the generic error, which is repeated
          but true.
        -->
        <hpd-async-state
          [status]="repository.caseQueueState().status"
          [empty]="false"
          forbiddenKey="healthConnect.dashboard.refused.caseCounts"
          (retry)="repository.reset()"
        >
          <hpd-stat-card-row [cards]="caseCards()" [columns]="3" (selected)="navigateCaseStatus($event)" />
        </hpd-async-state>
      </section>

      <!--
        NO EARNINGS ANYWHERE ON THIS PAGE, and the absence is the specification rather than an
        oversight (backlog row 263). dashboard-states.md, § Default View: "Do not show earnings on
        dashboard whatsoever. Remove earnings card."

        An earnings card stood here, linking to /earnings and fed by EarningsApiService.ownEarnings
        — a cross-stack read of hc-admin, swallowing its own failures because a clinician
        mid-onboarding has no professional record there to read. The whole of it went: the markup,
        the ownEarnings call in ngOnInit, the signal it filled and the money() formatter it used.
        Removing the markup alone would have left this page reading adminservice on every load for
        a figure nothing renders — invisible on screen and visible only in a network log.

        UNCONDITIONALLY, in every state. This is not row 259's welcome-page split: no status gates
        it, so the card is gone from the dashboard an ACTIVE && ACTIVE clinician sees as well.

        /earnings is untouched and remains the earnings surface — it keeps the sidebar entry
        (dashboard-states.md § Sidebar State lists Earnings under Show), the service, the model and
        the adminservice route. See adminservice-earnings-contract.md.
      -->

      <!--
        THE CASE READ, because that is what these three charts are made of (item 146). Every one is a
        pure function of the case collection — charts is a computed over the cached cases, not a
        fetch of its own — so the case read's state is the only one that describes them. The
        demographic cards above already sit outside this wrapper and come from the directory read,
        which now carries its own. Binding one shared state here made a refused case queue and a
        failed single-patient record fetch equally able to blank a panel neither had a part in.
      -->
      <hpd-async-state [status]="repository.caseQueueState().status" [empty]="false" (retry)="repository.reset()">
        <section class="mt-4 grid grid-cols-1 gap-3.5" [attr.aria-label]="'healthConnect.dashboard.charts.title' | translate">
          <hpd-line-chart
            [points]="repository.charts().caseTimeline"
            titleKey="healthConnect.dashboard.caseTime"
            descriptionKey="healthConnect.dashboard.charts.caseTimeDescription"
            legendKey="healthConnect.dashboard.charts.caseSeries"
            xAxisKey="healthConnect.dashboard.charts.date"
            yAxisKey="healthConnect.dashboard.charts.caseCount"
          />
          <hpd-pie-chart
            [segments]="repository.charts().caseDistribution"
            titleKey="healthConnect.dashboard.caseDistribution"
            descriptionKey="healthConnect.dashboard.charts.caseDistributionDescription"
            legendKey="healthConnect.dashboard.charts.statusLegend"
          />
          <hpd-grouped-bar-chart
            [groups]="repository.charts().casesByPatient"
            titleKey="healthConnect.dashboard.casePatient"
            descriptionKey="healthConnect.dashboard.charts.casePatientDescription"
            legendKey="healthConnect.dashboard.charts.caseLegend"
            xAxisKey="healthConnect.patient.patient"
            yAxisKey="healthConnect.dashboard.charts.caseCount"
          />
        </section>
      </hpd-async-state>

      <!--
        THE ONBOARDING WIZARD'S OUTLET (T8). profile.md:171-173 opens step 1's dialog "over the
        dashboard", and the house routed-overlay idiom makes an overlay a CHILD of the page it
        overlays so the page stays mounted underneath — see the patients tree in
        health-connect.routes.ts for the argument. Empty on every ordinary visit: nothing renders
        here until the URL names a pane.
      -->
      <router-outlet />
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardPageComponent implements OnInit {
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  private readonly router = inject(Router);
  private readonly progressService = inject(OnboardingProgressService);
  private readonly wizard = inject(WizardService);
  private readonly accountService = inject(AccountService);
  private readonly destroyRef = inject(DestroyRef);

  /** Tracked the way the sidebar tracks it, and read only by the redirect below. */
  private account: Account | null = null;

  ngOnInit(): void {
    this.accountService
      .getAuthenticationState()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(account => {
        this.account = account;
        // Step 1's trigger rides this subscription rather than fetching the account again — see the
        // method, which explains both why it is here and why it is immediate.
        this.openAccountStepWhenIncomplete(account);
      });

    this.progressService.load();
    this.scheduleIncompleteProfileRedirect();
  }

  /**
   * Step 1's trigger — `profile.md:171-173`, T8.
   *
   * <p><i>"After registration and activation the professional can log in to the dashboard, which
   * loads the account. If any of the account's `firstName`, `lastName`, `langKey` or `imageUrl` is
   * empty, open the User update dialog over the dashboard."</i> The dialog is a routed overlay that
   * is a child of this page, so "open it" is a navigation and the dashboard stays rendered
   * underneath.
   *
   * <p>⚠ <b>Immediately, not after a beat</b>, unlike {@link scheduleIncompleteProfileRedirect}
   * below. That one moves a clinician to a different page and is deliberately delayed so the move
   * reads as deliberate; this one opens a dialog over the page they are already on, and a dialog that
   * appears two seconds after arrival reads as something having gone wrong.
   *
   * <p>⛔ <b>All four fields, `imageUrl` among them.</b> Four in the trigger over a form of three was
   * a dialog that reopened for ever (`profile-addendum.md` § 5 Q12); `backlog.md` row 232 settled it
   * by building the avatar upload, so step 1 has an input for every field it tests.
   * {@code WizardService.accountStepComplete} is the one place that test is written, and it answers
   * <b>null</b> until the account has arrived — which is why this runs inside the account
   * subscription and not beside it. Opening a dialog on an unknown account opens it over everybody.
   *
   * <p>⚠ <b>Only when the reader is still on the bare dashboard.</b> Someone who has already opened a
   * pane, or clicked through, has chosen where to be — and re-navigating to pane 1 from inside pane 3
   * would be the wizard yanking them backwards.
   *
   * <p>⛔ <b>Driven by the account subscription this page already had, not by a second
   * {@code identity()} call.</b> That service caches one account for the whole application and
   * {@code getAuthenticationState()} replays it, so a second fetch here would be a second answer to
   * "who is signed in" — the duplication {@code WizardService} exists to remove. It is also what kept
   * this page's own spec honest: a second read put an unflushed {@code GET api/account} in front of
   * thirty-seven existing cases.
   */
  private openAccountStepWhenIncomplete(account: Account | null): void {
    this.wizard.setAccount(account);
    if (this.wizard.accountStepComplete() === false && this.router.url.split('?')[0] === '/dashboard') {
      void this.router.navigateByUrl(wizardPanePath('account'));
    }
  }

  /**
   * Send a clinician with an unfinished profile to it, two seconds after they land here.
   *
   * <p>Two seconds rather than immediately so the dashboard is seen rather than flickered past —
   * being bounced instantly reads as a broken link, whereas a beat of dashboard then a move reads
   * as being taken somewhere.
   *
   * <p>Four conditions guard it, and each has a failure it prevents:
   *
   * <ul>
   *   <li><b>only when the server has answered</b> — {@code complete()} is null until then, and
   *       treating unknown as incomplete would bounce people whose profile is finished;
   *   <li><b>only an account with no clinical authority</b> — see below;
   *   <li><b>only if still on the dashboard</b> — someone who clicked through in that beat has
   *       chosen where to be, and yanking them away is worse than not nudging at all;
   *   <li><b>cancelled on destroy</b> — otherwise the timer fires against a dead component and
   *       navigates whoever is now on screen.
   * </ul>
   *
   * <p>The authority test is the same rule {@code ShellNavGroup.clinicalOnly} keys on, and for the
   * same reason: an incomplete application does <em>not</em> mean an incomplete clinician.
   * {@code /api/onboarding/progress} answers {@code complete: false} at 0% for an account with no
   * application at all — deliberately, so the profile page can render a meter for someone an admin
   * invited — and every clinician seeded or invited rather than hired through the careers page is
   * in exactly that state. Without this condition the redirect fires on all of them, and a
   * {@code ROLE_DOCTOR} bounces off the dashboard two seconds after every arrival, with the whole
   * sidebar visible and none of it reachable.
   *
   * <p>The route admits {@link Authority#USER}, so the nudge still has its intended target: an
   * applicant who lands here holds nothing but {@code ROLE_USER}.
   *
   * <p>⚠ <b>A fifth condition since T8: not while a wizard pane is open.</b> The panes are children
   * of this route, so {@code router.url.startsWith('/dashboard')} is <em>true</em> inside them and
   * this timer would fire two seconds after step 1's dialog opened, pulling the applicant out of the
   * pane they are in. That is the same failure the "only if still on the dashboard" condition above
   * exists to prevent, one level down — someone inside a pane has been taken somewhere, and yanking
   * them away again is worse than not nudging at all.
   *
   * <p>The <b>destination</b> is the wizard's first outstanding pane (T6, re-pointed from the
   * retired tab page). {@code WizardService.firstOutstandingPane} is built for exactly this — "what
   * the dashboard opens on arrival" — and the fallback to pane 1 covers the moment before the meter
   * has said which pane is outstanding; the condition on {@code complete()} has already established
   * that one is.
   */
  private scheduleIncompleteProfileRedirect(): void {
    const timer = setTimeout(() => {
      const clinician = hasClinicalAuthority(this.account?.authorities);
      const onBareDashboard = this.router.url.split('?')[0] === '/dashboard';
      if (this.progressService.complete() === false && !clinician && onBareDashboard) {
        void this.router.navigateByUrl(wizardPanePath(this.wizard.firstOutstandingPane() ?? 'account'));
      }
    }, INCOMPLETE_PROFILE_REDIRECT_MS);

    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }

  /**
   * The notices to print in place of the demographic cards — one per row-removing part this read
   * was actually refused, as catalogue keys.
   *
   * <p>Derived from {@link ROW_REMOVING_PARTS} rather than from what arrived on the wire, the rule
   * the directory and record screens already follow: a token this bundle does not recognise is
   * dropped by {@link parseRestrictedParts} and never reaches a catalogue key that does not exist.
   * Empty for an unrestricted read and for a `lastActivity`-only one — five of the eight
   * disciplines see exactly the dashboard they always saw.
   *
   * <p>A key per part rather than one sentence for "restricted", because the day `api/` names a
   * second row-removing part it will cost something the `caseAssignments` sentence does not
   * describe, and `restricted-part-names.spec.ts` fails until all four catalogues carry it.
   *
   * <p><b>Plus one for the part that could not be named at all.</b> Dropping an unknown token is
   * the right answer to *what do I print* and the wrong one to *may I assert this number*: if the
   * token `parseRestrictedParts` discarded was row-removing, these figures are short and nothing in
   * this bundle can know it. `api/`'s enum is still growing and the repos ship as independently
   * tagged images, so a web bundle older than the service is the structural case. The generic
   * sentence names nothing, because naming it is precisely what this bundle cannot do.
   */
  readonly demographicRestrictionNotices = computed<readonly string[]>(() => {
    const refused = this.repository.directoryRestrictions();
    const named = ROW_REMOVING_PARTS.filter(part => refused.includes(part)).map(part => `healthConnect.dashboard.restricted.${part}`);
    return this.repository.directoryNamedUnknownPart() ? [...named, 'healthConnect.dashboard.restricted.unknown'] : named;
  });

  /** Whether any figure below the demographics heading could still be stated honestly. */
  readonly demographicsRestricted = computed(() => this.demographicRestrictionNotices().length > 0);

  /**
   * The patient / female / male / children counts — and **nothing at all** when the directory they
   * count was served short of rows (backlog item 125).
   *
   * <p>Empty rather than hidden by the template alone, so the wrong numbers do not exist rather
   * than existing out of sight: a later caller reading this signal gets no figure instead of a
   * confidently short one, and the suppression cannot be lost by an edit to the markup.
   *
   * <p><b>All four go, not some.</b> Every one of them is a function of directory membership —
   * `length`, and three filters over the same rows — so each is lower than the truth by an amount
   * nothing here can state. That is the client-side shape of `api/`'s own `summary()`, which reads
   * `size()`, `sex()` and `isChild()` and refuses when the case half is refused.
   *
   * <p><b>A `lastActivity` refusal leaves them alone</b>, deliberately: it blanks a field no card
   * reads, so the figures are identical with the activity log and without it — item 112's argument
   * for counting through that refusal, and the property `dashboard-page.component.spec.ts` pins by
   * comparing the two rather than by restating today's field list.
   *
   * <p><b>And nothing at all when the directory read did not answer</b> (backlog item 165). Item 125
   * covered a read served *short of rows*; a read refused outright carries no header to be short in,
   * so `demographicsRestricted()` is false and these four counted an empty cache. Two conditions
   * because they are two facts — a partial answer and no answer — and the sentences printed for them
   * differ accordingly.
   */
  readonly demographicCards = computed<readonly StatCard[]>(() => {
    if (!countable(this.repository.directoryState()) || this.demographicsRestricted()) {
      return [];
    }
    const patients = this.repository.patientRows();
    return [
      { id: 'patients', labelKey: 'healthConnect.stats.patients', count: patients.length, variant: 'neutral' },
      {
        id: 'female',
        labelKey: 'healthConnect.stats.female',
        count: patients.filter(patient => patient.sex === 'female').length,
        variant: 'neutral',
      },
      {
        id: 'male',
        labelKey: 'healthConnect.stats.male',
        count: patients.filter(patient => patient.sex === 'male').length,
        variant: 'neutral',
      },
      { id: 'kids', labelKey: 'healthConnect.stats.kids', count: patients.filter(patient => patient.isChild).length, variant: 'neutral' },
    ];
  });

  /**
   * The urgent / open / closed counts — and **nothing at all** unless the case read answered
   * (backlog item 165).
   *
   * <p>Emptied in the model as well as hidden by the wrapper, for the reason item 125 gives one
   * computed up: a later caller reading this signal gets no figure rather than a confidently wrong
   * one, and the suppression cannot be lost by an edit to the markup. The two halves guard
   * different things — the wrapper decides what is on screen, this decides what the number *is* —
   * and a test against only one of them passes while the other is deleted.
   *
   * <p><b>A `ready` read with three zeros still shows three zeros.</b> That is the whole difficulty
   * of this row: a technician may genuinely have no open cases, and "never print a number" would be
   * the same defect wearing the other coat. Only the read's own state can tell the two apart, which
   * is why {@link countable} keys on it and on nothing about the counts themselves.
   */
  readonly caseCards = computed<readonly StatCard[]>(() => {
    if (!countable(this.repository.caseQueueState())) {
      return [];
    }
    const counts = this.repository.caseCounts();
    return (['urgent', 'open', 'closed'] as const).map(status => ({
      id: status,
      labelKey: `healthConnect.stats.${status}`,
      count: counts[status],
      variant: status,
    }));
  });

  navigateDemographic(id: string): void {
    const queryParams = id === 'female' || id === 'male' ? { gender: id } : id === 'kids' ? { children: 'true' } : undefined;
    void this.router.navigate(['/patients'], { queryParams });
  }

  navigateCaseStatus(status: string): void {
    void this.router.navigate(['/cases'], { queryParams: { status: status as CaseStatus } });
  }
}
