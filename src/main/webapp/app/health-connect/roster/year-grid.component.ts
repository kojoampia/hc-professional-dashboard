import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { DAYS_IN_WEEK, addDays, monthOf, startOfIsoWeek } from './calendar-date.util';
import { cellClasses, cellDescription, cellGlyph } from './roster-day-cell';
import { RosterDay } from './roster-day.model';

interface YearDay {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  classes: string;
  glyph: string;
  descriptionKey: string;
  descriptionParams: Record<string, string>;
}

interface YearMonth {
  month: number;
  label: string;
  weeks: YearDay[][];
}

const MONTHS_IN_YEAR = 12;
const MAX_WEEKS = 6;

/**
 * Year view of the duty roster (docs/duty-roster.md §§ 9–10, DR7): twelve mini-month grids.
 *
 * <p><b>This layout is what closed open question 1.</b> The question was which year's grid the week
 * of 29 Dec – 4 Jan belongs to — and it only exists if a week is a unit of the layout. Here it is not:
 * each month draws its own leading and trailing days, so the boundary week appears as ordinary
 * spill-over in December's grid and again in January's, and no week has to be filed under a year.
 * Owner decision, 2026-08-21. ISO *numbering* is unaffected and still what `week-number.util`
 * computes; the month view shows it, and this one has no room for a week-number column.
 *
 * <p><b>The tone, glyph and accessible name come from `roster-day-cell`, the same as the month and
 * week grids.</b> That is the whole reason that file exists. Three views painting the same day from
 * three copies of the rule is three chances to disagree, and a year view that disagrees with the
 * month view about a single day is the kind of thing nobody reports and everybody distrusts.
 *
 * <p><b>What is deliberately not here: the visit count.</b> The summary carries one, and a density
 * shading was tempting — but a day is already carrying a tone, a glyph and a dimming for
 * out-of-month, and a fourth visual variable at this cell size would make the four states harder to
 * tell apart rather than adding information. The count is one click away in the day popup.
 */
@Component({
  standalone: true,
  selector: 'hpd-year-grid',
  imports: [TranslateModule],
  template: `
    <div
      class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="group"
      [attr.aria-label]="'healthConnect.roster.calendar.yearGrid' | translate"
      data-cy="yearGrid"
    >
      @for (month of months(); track month.month) {
        <section [attr.data-cy]="'yearMonth-' + month.month">
          <h3 class="m-0 mb-1 text-center text-xs font-bold uppercase tracking-wider text-hpd-muted">{{ month.label }}</h3>
          <table class="w-full table-fixed border-collapse" [attr.aria-label]="month.label">
            <thead>
              <tr>
                @for (weekday of weekdayInitials(); track weekday.index) {
                  <th scope="col" class="pb-0.5 text-[9px] font-bold uppercase text-hpd-subtle">
                    <abbr class="no-underline" [title]="weekday.long">{{ weekday.initial }}</abbr>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (week of month.weeks; track $index) {
                <tr>
                  @for (day of week; track day.date) {
                    @if (day.inMonth) {
                      <td class="p-px" [attr.aria-current]="day.isToday ? 'date' : null">
                        <button
                          type="button"
                          class="hpd-focusable grid aspect-square w-full cursor-pointer place-items-center rounded-[3px] border border-hpd-border text-[10px] leading-none text-inherit"
                          [class]="day.classes"
                          [class.font-bold]="day.isToday"
                          [class.ring-2]="day.isToday"
                          [class.ring-hpd-primary]="day.isToday"
                          [attr.data-cy]="'yearDay-' + day.date"
                          (click)="daySelected.emit(day.date)"
                        >
                          <span class="sr-only">{{ day.descriptionKey | translate: day.descriptionParams }}</span>
                          <span aria-hidden="true">{{ day.dayOfMonth }}</span>
                        </button>
                      </td>
                    } @else {
                      <!--
                        Padding, not a day. A neighbouring month's date rendered here would be
                        clickable in two grids at once and countable twice; at this size there is no
                        room to dim it convincingly either, so it is simply absent.
                      -->
                      <td class="p-px"><span class="sr-only">&nbsp;</span></td>
                    }
                  }
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YearGridComponent {
  readonly year = input.required<number>();
  readonly days = input.required<Map<string, RosterDay>>();
  readonly today = input.required<string>();
  readonly locale = input<string>('en');
  readonly shiftNames = input<Record<string, string | undefined>>({});
  readonly toneNames = input<Record<string, string | undefined>>({});

  /** The day a reader picked — opens the same popup the month and week views open (DR6). */
  readonly daySelected = output<string>();

  /**
   * Single-letter weekday headers, Monday first.
   *
   * <p>`Intl`'s `narrow` weekday, not a hand-written "M T W T F S S": that string is only right for
   * English, and three of the four catalogues would need their own — with two of the seven identical
   * in most languages, which is a transposition waiting to happen. The full name stays available in
   * the `<abbr title>`.
   */
  readonly weekdayInitials = computed(() => {
    const narrow = new Intl.DateTimeFormat(this.locale(), { weekday: 'narrow', timeZone: 'UTC' });
    const long = new Intl.DateTimeFormat(this.locale(), { weekday: 'long', timeZone: 'UTC' });
    // 2024-01-01 is a Monday, so this walks Monday to Sunday whatever the locale's own first day is.
    return Array.from({ length: DAYS_IN_WEEK }, (_unused, index) => {
      const date = new Date(Date.UTC(2024, 0, 1 + index));
      return { index, initial: narrow.format(date), long: long.format(date) };
    });
  });

  readonly months = computed<YearMonth[]>(() => {
    const year = this.year();
    const days = this.days();
    const today = this.today();
    const monthLabel = new Intl.DateTimeFormat(this.locale(), { month: 'long', timeZone: 'UTC' });
    const longDate = new Intl.DateTimeFormat(this.locale(), { dateStyle: 'long', timeZone: 'UTC' });

    return Array.from({ length: MONTHS_IN_YEAR }, (_unused, index) => {
      const month = index + 1;
      const first = `${year}-${String(month).padStart(2, '0')}-01`;
      const cursorStart = startOfIsoWeek(first);
      const weeks: YearDay[][] = [];

      for (let weekIndex = 0; weekIndex < MAX_WEEKS; weekIndex++) {
        const monday = addDays(cursorStart, weekIndex * DAYS_IN_WEEK);
        // Stop as soon as a row holds none of this month, rather than always drawing six and leaving
        // a blank stripe under February.
        if (weekIndex > 0 && monthOf(monday) !== month && monthOf(addDays(monday, DAYS_IN_WEEK - 1)) !== month) {
          break;
        }
        weeks.push(
          Array.from({ length: DAYS_IN_WEEK }, (_ignored, offset) => {
            const date = addDays(monday, offset);
            const day = days.get(date) ?? { date, shifts: [], absence: null };
            const shiftNames = day.shifts.map(shift => this.shiftNames()[shift] ?? shift).join(', ');
            const toneName = day.absence ? this.toneNames()[day.absence.type] ?? day.absence.type : '';
            const description = cellDescription(day, longDate.format(new Date(`${date}T00:00:00Z`)), shiftNames, toneName);
            return {
              date,
              dayOfMonth: Number(date.slice(8, 10)),
              inMonth: monthOf(date) === month && date.startsWith(String(year)),
              isToday: date === today,
              classes: cellClasses(day),
              glyph: cellGlyph(day),
              descriptionKey: description.key,
              descriptionParams: description.params,
            };
          }),
        );
      }
      return { month, label: monthLabel.format(new Date(`${first}T00:00:00Z`)), weeks };
    });
  });
}
