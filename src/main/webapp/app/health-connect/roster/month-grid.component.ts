import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { DAYS_IN_WEEK, addDays, monthOf, startOfIsoWeek, startOfMonth } from './calendar-date.util';
import { cellClasses, cellDescription, cellGlyph } from './roster-day-cell';
import { RosterDay } from './roster-day.model';
import { isoWeekOf } from './week-number.util';

interface MonthWeek {
  week: number;
  weekYear: number;
  days: MonthDay[];
}

interface MonthDay extends RosterDay {
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  classes: string;
  glyph: string;
  descriptionKey: string;
  descriptionParams: Record<string, string>;
}

/** A month spans five weeks usually and six at the edges; never more, never fewer than four. */
const MAX_WEEKS = 6;

/**
 * Month view of the duty roster (docs/duty-roster.md § 9, DR5): a week-number column and day cells.
 *
 * <p><b>It is a real `<table>`</b>, because a month grid is genuinely tabular — a week crossed with a
 * weekday — and the semantics are what let a screen-reader user arrow around it and hear which column
 * they are in. A grid of `<div>`s looks identical and navigates as one long list of numbers.
 *
 * <p><b>Leading and trailing days are shown, dimmed, not blanked.</b> A month that begins on a
 * Thursday has three empty cells before it, and a clinician working the 31st of the previous month
 * needs to see that shift when they open this month — the week it belongs to is on screen either way.
 * `inMonth` drives the dimming and nothing else; the days are otherwise ordinary.
 */
@Component({
  standalone: true,
  selector: 'hpd-month-grid',
  imports: [TranslateModule],
  template: `
    <table class="w-full table-fixed border-collapse text-sm" [attr.aria-label]="'healthConnect.roster.calendar.monthGrid' | translate">
      <thead>
        <tr>
          <th scope="col" class="w-10 border-b border-hpd-border px-1 py-2 text-[11px] font-bold uppercase tracking-wider text-hpd-subtle">
            <abbr class="no-underline" [title]="'healthConnect.roster.calendar.weekNumberFull' | translate">
              {{ 'healthConnect.roster.calendar.weekNumberAbbrev' | translate }}
            </abbr>
          </th>
          @for (weekday of weekdayNames(); track weekday.index) {
            <th scope="col" class="border-b border-hpd-border px-1 py-2 text-[11px] font-bold uppercase tracking-wider text-hpd-muted">
              <abbr class="no-underline" [title]="weekday.long">{{ weekday.short }}</abbr>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (week of weeks(); track week.weekYear + '-' + week.week) {
          <tr>
            <th
              scope="row"
              class="border border-hpd-border bg-hpd-cream px-1 py-2 text-center align-top text-[11px] font-bold text-hpd-subtle"
            >
              <span class="sr-only">{{
                'healthConnect.roster.calendar.weekOf' | translate: { week: week.week, year: week.weekYear }
              }}</span>
              <span aria-hidden="true">{{ week.week }}</span>
            </th>
            @for (day of week.days; track day.date) {
              <td
                class="h-16 border border-hpd-border p-1 align-top md:h-20"
                [class]="day.classes"
                [class.opacity-40]="!day.inMonth"
                [attr.data-cy]="'day-' + day.date"
                [attr.aria-current]="day.isToday ? 'date' : null"
              >
                <span class="sr-only">{{ day.descriptionKey | translate: day.descriptionParams }}</span>
                <div aria-hidden="true" class="flex h-full flex-col gap-0.5">
                  <span class="flex items-center justify-between">
                    <span
                      class="text-xs font-semibold"
                      [class.rounded-full]="day.isToday"
                      [class.bg-hpd-primary]="day.isToday"
                      [class.text-white]="day.isToday"
                      [class.px-1.5]="day.isToday"
                    >
                      {{ day.dayOfMonth }}
                    </span>
                    @if (day.glyph) {
                      <span class="text-[10px] leading-none">{{ day.glyph }}</span>
                    }
                  </span>
                  @if (day.absence) {
                    <span class="truncate text-[10px] font-semibold uppercase tracking-wide">
                      {{ 'healthConnect.roster.calendar.absenceTypes.' + day.absence.type | translate }}
                    </span>
                  }
                  @for (shift of day.shifts; track $index) {
                    <span class="truncate text-[10px] leading-tight">
                      {{ 'healthConnect.roster.calendar.shiftShort.' + shift | translate }}
                    </span>
                  }
                </div>
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthGridComponent {
  /** Any date inside the month to render. */
  readonly anchorDate = input.required<string>();
  readonly days = input.required<Map<string, RosterDay>>();
  readonly today = input.required<string>();
  /** BCP-47 tag for the weekday names — the active ngx-translate language. */
  readonly locale = input<string>('en');
  /**
   * Resolved shift and absence names, passed in rather than translated here.
   *
   * <p>They are needed as *strings* to compose a cell's accessible name, and a template pipe cannot
   * produce one — `| translate` renders into the DOM, it does not return a value to interpolate into
   * another parameter. The parent already holds them, so it resolves them once for the whole grid
   * instead of this component injecting `TranslateService` to do it per cell.
   */
  readonly shiftNames = input<Record<string, string | undefined>>({});
  readonly toneNames = input<Record<string, string | undefined>>({});

  /**
   * Weekday column headers in the viewer's own language and the ISO order Monday-first.
   *
   * <p>Taken from `Intl`, not from the four i18n catalogues, and deliberately: weekday names are
   * locale data rather than product copy, every browser already ships them for every locale, and
   * four hand-maintained lists of seven names is four chances to transpose two of them. The same
   * reasoning the dashboard and earnings pages already apply to `Intl.NumberFormat`.
   */
  readonly weekdayNames = computed(() => {
    const short = new Intl.DateTimeFormat(this.locale(), { weekday: 'short', timeZone: 'UTC' });
    const long = new Intl.DateTimeFormat(this.locale(), { weekday: 'long', timeZone: 'UTC' });
    // 2024-01-01 is a Monday, so this walks Monday to Sunday whatever the locale's own first day is.
    return Array.from({ length: DAYS_IN_WEEK }, (_unused, index) => {
      const date = new Date(Date.UTC(2024, 0, 1 + index));
      return { index, short: short.format(date), long: long.format(date) };
    });
  });

  /** Long-form date for a cell's accessible name — "21 August 2026", in the viewer's language. */
  private readonly longDate = computed(() => new Intl.DateTimeFormat(this.locale(), { dateStyle: 'long', timeZone: 'UTC' }));

  readonly weeks = computed<MonthWeek[]>(() => {
    const first = startOfMonth(this.anchorDate());
    const month = monthOf(first);
    const days = this.days();
    const today = this.today();
    const cursorStart = startOfIsoWeek(first);
    const longDate = this.longDate();

    const weeks: MonthWeek[] = [];
    for (let weekIndex = 0; weekIndex < MAX_WEEKS; weekIndex++) {
      const monday = addDays(cursorStart, weekIndex * DAYS_IN_WEEK);
      // A month needs a sixth row only when it starts late and runs long; stop as soon as a row
      // holds none of it, rather than always drawing six and leaving a blank stripe.
      if (weekIndex > 0 && monthOf(monday) !== month && monthOf(addDays(monday, DAYS_IN_WEEK - 1)) !== month) {
        break;
      }
      const { week, weekYear } = isoWeekOf(monday);
      weeks.push({
        week,
        weekYear,
        days: Array.from({ length: DAYS_IN_WEEK }, (_unused, offset) => {
          const date = addDays(monday, offset);
          const day = days.get(date) ?? { date, shifts: [], absence: null };
          const shiftNames = day.shifts.map(shift => this.shiftNames()[shift] ?? shift).join(', ');
          const toneName = day.absence ? this.toneNames()[day.absence.type] ?? day.absence.type : '';
          const description = cellDescription(day, longDate.format(new Date(`${date}T00:00:00Z`)), shiftNames, toneName);
          return {
            ...day,
            dayOfMonth: Number(date.slice(8, 10)),
            inMonth: monthOf(date) === month,
            isToday: date === today,
            classes: cellClasses(day),
            glyph: cellGlyph(day),
            descriptionKey: description.key,
            descriptionParams: description.params,
          };
        }),
      });
    }
    return weeks;
  });
}
