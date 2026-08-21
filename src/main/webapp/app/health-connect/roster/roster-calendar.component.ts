import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, forkJoin, map } from 'rxjs';

import { AbsenceApiService } from '../api/absence-api.service';
import { DutyRosterAssignmentsService } from '../api/duty-roster-assignments.service';
import { DutyRosterShift } from '../health-connect.models';
import { DAYS_IN_WEEK, addDays, addMonths, startOfIsoWeek, startOfMonth, todayIsoDate, yearOf } from './calendar-date.util';
import { DayListComponent } from './day-list.component';
import { MonthGridComponent } from './month-grid.component';
import { RosterDay, RosterDayTone, buildRosterDays, indexDaySummaries } from './roster-day.model';
import { WeekGridComponent } from './week-grid.component';
import { YearGridComponent } from './year-grid.component';
import { isoWeekOf } from './week-number.util';

export type CalendarView = 'month' | 'week' | 'year';

/** Every tone that takes a fill. `off` is the page showing through and has no legend swatch of its own. */
const LEGEND_TONES: readonly RosterDayTone[] = ['working', 'holiday', 'sick', 'other'];
const SHIFTS: readonly DutyRosterShift[] = ['DAY', 'EVENING', 'NIGHT', 'FLEXIBLE'];
const ABSENCE_TYPES = ['HOLIDAY', 'SICK', 'OTHER'] as const;

/** A month grid draws at most six weeks; fetch the whole span it might show, not just the month. */
const MAX_MONTH_GRID_WEEKS = 6;
const MONTHS_IN_YEAR = 12;

/** Written out because Tailwind scans for literals — see {@link RosterCalendarComponent.legendSwatchClass}. */
const LEGEND_SWATCH_CLASSES: Record<RosterDayTone, string> = {
  working: 'bg-hpd-roster-working',
  holiday: 'bg-hpd-roster-holiday',
  sick: 'bg-hpd-roster-sick',
  other: 'bg-hpd-roster-other',
  off: '',
};

/**
 * The duty-roster calendar (docs/duty-roster.md § 9, DR5): view switching, navigation, and the
 * colour legend, over a month grid and a week grid.
 *
 * <p><b>Custom, on nothing but `dayjs`-free date arithmetic.</b> § 9 rejected a calendar library:
 * one would have to be restyled to the BridgeCare tokens anyway, adds bundle weight, and
 * FullCalendar's scheduler views are commercially licensed. The cost accepted is that the date-grid
 * edge cases are ours — they live in `calendar-date.util` and `week-number.util`, with the DST,
 * week-53, month-boundary and year-boundary cases asserted.
 *
 * <p><b>It fetches the range it draws.</b> Paging to another month re-reads that month's span rather
 * than filtering an unbounded roster in memory, and the fetch covers the whole visible grid including
 * the leading and trailing days of the neighbouring months — otherwise the first row of a month
 * renders empty for days that do have shifts on them.
 *
 * <p><b>Absences decorate; rounds inform.</b> An unreachable absence endpoint yields an empty list
 * rather than an error (see `AbsenceApiService`), so a clinician who cannot reach it still sees their
 * shifts. The reverse is not true: a failed roster read is a visible empty state, because a calendar
 * that silently shows no shifts is worse than one that says it could not load them.
 */
@Component({
  standalone: true,
  selector: 'hpd-roster-calendar',
  imports: [TranslateModule, MonthGridComponent, WeekGridComponent, YearGridComponent, DayListComponent],
  template: `
    <section class="overflow-hidden rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" data-cy="rosterCalendar">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-hpd-border bg-hpd-cream px-5 py-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="hpd-focusable hpd-btn hpd-btn-ghost !px-2.5 !py-1"
            [attr.aria-label]="'healthConnect.roster.calendar.previous' | translate"
            data-cy="calendarPrevious"
            (click)="step(-1)"
          >
            &#8249;
          </button>
          <button
            type="button"
            class="hpd-focusable hpd-btn hpd-btn-ghost !px-2.5 !py-1"
            [attr.aria-label]="'healthConnect.roster.calendar.next' | translate"
            data-cy="calendarNext"
            (click)="step(1)"
          >
            &#8250;
          </button>
          <button
            type="button"
            class="hpd-focusable hpd-btn hpd-btn-ghost !px-3 !py-1 !text-xs"
            data-cy="calendarToday"
            (click)="goToday()"
          >
            {{ 'healthConnect.roster.calendar.today' | translate }}
          </button>
        </div>

        <h2 class="m-0 text-sm font-bold text-hpd-primary-dark" data-cy="calendarTitle" aria-live="polite">{{ title() }}</h2>

        <div class="flex items-center gap-1" role="group" [attr.aria-label]="'healthConnect.roster.calendar.viewSwitcher' | translate">
          @for (option of views; track option) {
            <button
              type="button"
              class="hpd-focusable hpd-btn !px-3 !py-1 !text-xs"
              [class.hpd-btn-primary]="view() === option"
              [class.hpd-btn-ghost]="view() !== option"
              [attr.aria-pressed]="view() === option"
              [attr.data-cy]="'calendarView-' + option"
              (click)="view.set(option)"
            >
              {{ 'healthConnect.roster.calendar.views.' + option | translate }}
            </button>
          }
        </div>
      </header>

      <div class="overflow-x-auto p-3 md:p-5">
        @if (view() === 'month') {
          <hpd-month-grid
            [anchorDate]="anchor()"
            [days]="days()"
            [today]="today()"
            [locale]="locale()"
            [shiftNames]="shiftNames()"
            [toneNames]="absenceNames()"
            (daySelected)="openDay($event)"
          />
        } @else if (view() === 'week') {
          <hpd-week-grid
            [anchorDate]="anchor()"
            [days]="days()"
            [today]="today()"
            [locale]="locale()"
            [shiftNames]="shiftNames()"
            [toneNames]="absenceNames()"
            (daySelected)="openDay($event)"
          />
        } @else {
          <hpd-year-grid
            [year]="anchorYear()"
            [days]="days()"
            [today]="today()"
            [locale]="locale()"
            [shiftNames]="shiftNames()"
            [toneNames]="absenceNames()"
            (daySelected)="openDay($event)"
          />
        }
        @if (failed()) {
          <p class="m-0 mt-3 text-sm text-hpd-danger" data-cy="calendarError">
            {{ 'healthConnect.roster.calendar.loadFailed' | translate }}
          </p>
        }
      </div>

      <!--
        The legend is not optional decoration. The four tints measure only 1.02-1.10 against each
        other, so they are distinguished by hue rather than by lightness: in greyscale, or to a fully
        colour-blind reader, they are one colour. Every cell also carries a glyph and a text label;
        this names what the colours mean for everyone who can see them.
      -->
      <footer
        class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hpd-border bg-hpd-cream/50 px-5 py-2.5"
        data-cy="calendarLegend"
      >
        <span class="text-[11px] font-bold uppercase tracking-wider text-hpd-subtle">
          {{ 'healthConnect.roster.calendar.legend' | translate }}
        </span>
        @for (tone of legendTones; track tone) {
          <span class="flex items-center gap-1.5 text-xs text-hpd-muted">
            <span
              class="inline-block h-3 w-3 rounded-hpd-sm border border-hpd-border"
              [class]="legendSwatchClass(tone)"
              aria-hidden="true"
            ></span>
            {{ 'healthConnect.roster.calendar.tones.' + tone | translate }}
          </span>
        }
        <span class="flex items-center gap-1.5 text-xs text-hpd-muted">
          <span
            class="hpd-roster-pending inline-block h-3 w-3 rounded-hpd-sm border border-hpd-border bg-hpd-roster-holiday text-hpd-roster-holiday-accent"
            aria-hidden="true"
          ></span>
          {{ 'healthConnect.roster.calendar.tones.pending' | translate }}
        </span>
        <span class="flex items-center gap-1.5 text-xs text-hpd-muted">
          <span class="inline-block h-3 w-3 rounded-hpd-sm border border-hpd-border" aria-hidden="true"></span>
          {{ 'healthConnect.roster.calendar.tones.off' | translate }}
        </span>
      </footer>
    </section>

    <!--
      Created only while a day is open, and destroyed on close, so the day read happens on open and
      the trail panels do not survive into the next day the reader picks.
    -->
    @if (openDate(); as date) {
      <hpd-day-list [date]="date" [heading]="dayHeading()" (closed)="closeDay()" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RosterCalendarComponent {
  private readonly rosterService = inject(DutyRosterAssignmentsService);
  private readonly absenceService = inject(AbsenceApiService);
  private readonly translate = inject(TranslateService);

  readonly views: readonly CalendarView[] = ['month', 'week', 'year'];
  readonly legendTones = LEGEND_TONES;

  readonly view = signal<CalendarView>('month');
  readonly today = signal(todayIsoDate());
  readonly anchor = signal(todayIsoDate());
  readonly days = signal<Map<string, RosterDay>>(new Map());
  readonly failed = signal(false);

  /** The day whose popup is open, or null. Drives creation of `hpd-day-list` (DR6). */
  readonly openDate = signal<string | null>(null);

  /**
   * Re-resolved on every language change, because `TranslateService.instant` is a snapshot.
   *
   * <p>These feed the grids' accessible names, which are composed as strings rather than rendered by
   * a pipe — so nothing re-translates them when the language changes unless something recomputes.
   * Depending on `onLangChange` is what makes a mid-session language switch reach the screen-reader
   * text as well as the visible text.
   */
  private readonly langChange = toSignal(this.translate.onLangChange, { initialValue: null });

  readonly locale = computed(() => {
    this.langChange();
    return this.translate.currentLang || 'en';
  });

  readonly shiftNames = computed<Record<string, string>>(() => {
    this.langChange();
    return Object.fromEntries(SHIFTS.map(shift => [shift, this.translate.instant(`healthConnect.roster.shiftNames.${shift}`)]));
  });

  readonly absenceNames = computed<Record<string, string>>(() => {
    this.langChange();
    return Object.fromEntries(
      ABSENCE_TYPES.map(type => [type, this.translate.instant(`healthConnect.roster.calendar.absenceTypes.${type}`)]),
    );
  });

  /**
   * The inclusive span the current view draws — **the grid's span, not the period's**.
   *
   * <p>A month grid starts on the Monday of the week containing the 1st and runs to the Sunday of the
   * week containing the last day, so fetching "the month" would leave the leading and trailing cells
   * empty for days that genuinely have shifts on them. Six weeks is the widest a month grid gets.
   */
  readonly visibleRange = computed<{ from: string; to: string }>(() => {
    if (this.view() === 'week') {
      const monday = startOfIsoWeek(this.anchor());
      return { from: monday, to: addDays(monday, DAYS_IN_WEEK - 1) };
    }
    const from = startOfIsoWeek(startOfMonth(this.anchor()));
    return { from, to: addDays(from, MAX_MONTH_GRID_WEEKS * DAYS_IN_WEEK - 1) };
  });

  /** The calendar year the year view draws. Not the ISO week year — see `week-number.util`. */
  readonly anchorYear = computed(() => yearOf(this.anchor()));

  readonly title = computed(() => {
    const anchor = this.anchor();
    const utc = new Date(`${anchor}T00:00:00Z`);
    if (this.view() === 'year') {
      return String(this.anchorYear());
    }
    if (this.view() === 'week') {
      const { week, weekYear } = isoWeekOf(anchor);
      return this.translate.instant('healthConnect.roster.calendar.weekTitle', {
        week,
        year: weekYear,
        range: this.weekRangeLabel(anchor),
      });
    }
    return new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utc);
  });

  constructor() {
    effect(onCleanup => {
      const subscription = this.loadVisible().subscribe({
        next: days => {
          this.failed.set(false);
          this.days.set(days);
        },
        // Only the roster read can get here — the absence read swallows its own errors by contract.
        error: () => {
          this.failed.set(true);
          this.days.set(new Map());
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * The popup's heading, formatted here rather than inside it.
   *
   * <p>`DayListComponent` does no locale work at all: this component already holds the resolved
   * language and the `Intl` formatters, and a second copy of that plumbing is a second thing to
   * forget to update on a language change.
   */
  readonly dayHeading = computed(() => {
    const date = this.openDate();
    if (!date) {
      return '';
    }
    return new Intl.DateTimeFormat(this.locale(), { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
  });

  openDay(date: string): void {
    this.openDate.set(date);
  }

  closeDay(): void {
    this.openDate.set(null);
  }

  /** Move one period in `direction`: a year, a month or a week, matching the current view. */
  step(direction: number): void {
    this.anchor.update(current => {
      switch (this.view()) {
        case 'week':
          return addDays(current, direction * DAYS_IN_WEEK);
        case 'year':
          // Twelve months, not 365 days — a leap year would otherwise drift the anchor by a day
          // every time it is crossed, and addMonths already clamps 29 February to the 28th.
          return addMonths(current, direction * MONTHS_IN_YEAR);
        default:
          return addMonths(current, direction);
      }
    });
  }

  goToday(): void {
    const today = todayIsoDate();
    this.today.set(today);
    this.anchor.set(today);
  }

  /**
   * Literal class names, never `bg-hpd-roster-${tone}`.
   *
   * <p>Tailwind v4 finds classes by scanning source text, so a class assembled at runtime is one it
   * has never seen and does not emit — the swatch renders transparent and nothing fails. This repo is
   * unusually exposed to that: its `@source` directive exists because automatic content detection
   * already missed `app/` once under the custom webpack pipeline, and the symptom both times is
   * classes present in the DOM whose rules are absent from the stylesheet.
   */
  legendSwatchClass(tone: RosterDayTone): string {
    return LEGEND_SWATCH_CLASSES[tone];
  }

  private weekRangeLabel(anchor: string): string {
    const monday = startOfIsoWeek(anchor);
    const sunday = addDays(monday, DAYS_IN_WEEK - 1);
    const format = new Intl.DateTimeFormat(this.locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return `${format.format(new Date(`${monday}T00:00:00Z`))} – ${format.format(new Date(`${sunday}T00:00:00Z`))}`;
  }

  /**
   * The read behind the current view.
   *
   * <p><b>The year takes a different shape, and has to.</b> Month and week ask for a range and join
   * the absences in themselves; a year asks the summary endpoint, which already returns one record
   * per day with its absence resolved — including the range-to-days expansion and the
   * APPROVED-beats-REQUESTED rule. Reusing the range read for a year would mean 365 days of
   * assignments and every absence record, joined client-side, to draw twelve small grids: a much
   * larger payload for an answer the server already computes, and a second implementation of a rule
   * that must not drift from `summariseYear`.
   *
   * <p>The summary carries no customer at all — shift names and a count — which is also what makes a
   * year of it safe to hold in a browser, unlike the day read.
   */
  private loadVisible(): Observable<Map<string, RosterDay>> {
    if (this.view() === 'year') {
      return this.rosterService.summary(this.anchorYear()).pipe(map(indexDaySummaries));
    }
    const { from, to } = this.visibleRange();
    return forkJoin({
      assignments: this.rosterService.range(from, to),
      absences: this.absenceService.mine(from, to),
    }).pipe(map(({ assignments, absences }) => buildRosterDays(this.datesBetween(from, to), assignments, absences)));
  }

  private datesBetween(from: string, to: string): string[] {
    const dates: string[] = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
      dates.push(date);
    }
    return dates;
  }
}
