import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { DutyRosterShift } from '../health-connect.models';
import { cellClasses, cellDescription, cellGlyph } from './roster-day-cell';
import { RosterDay } from './roster-day.model';
import { isoWeekDays } from './week-number.util';

interface WeekColumn {
  date: string;
  weekdayShort: string;
  dayOfMonth: number;
  isToday: boolean;
  day: RosterDay;
  classes: string;
  glyph: string;
  descriptionKey: string;
  descriptionParams: Record<string, string>;
}

interface ShiftRow {
  shift: DutyRosterShift;
  cells: { date: string; assigned: boolean; classes: string; isToday: boolean }[];
}

/**
 * The four shifts as rows, in window order (docs/duty-roster.md § 2).
 *
 * <p><b>`FLEXIBLE` occupies its own fourth row, below `NIGHT`</b> — § 9 says so explicitly. It is not
 * a time of day and does not belong interleaved with the three that are; it covers the whole date in
 * individually agreed 2–4 hour blocks, and putting it anywhere in the middle implies a window it does
 * not have.
 */
const SHIFT_ROWS: readonly DutyRosterShift[] = ['DAY', 'EVENING', 'NIGHT', 'FLEXIBLE'];

/**
 * Week view of the duty roster (docs/duty-roster.md § 9, DR5): days Monday–Sunday across, shifts
 * down.
 *
 * <p>Two bands, and they answer different questions. The **day header band** carries the day's state
 * — its colour, its absence, whether it is today — which is what the month view shows too. The
 * **shift matrix** below it says which of the four shifts are assigned on each day, which the month
 * view has no room for and which is the reason to open a week at all.
 *
 * <p>The matrix is where the `NIGHT` wrap is easiest to misread, so the row says its window out loud
 * rather than leaving it implied: a `NIGHT` cell under Tuesday is a shift that starts at 23:00 on
 * Tuesday and ends at 07:00 on Wednesday, and it is marked on Tuesday because that is the date it is
 * assigned to. Splitting it across two columns would be prettier and wrong — it would double-count
 * the shift and disagree with every other view.
 */
@Component({
  standalone: true,
  selector: 'hpd-week-grid',
  imports: [TranslateModule],
  template: `
    <table class="w-full table-fixed border-collapse text-sm" [attr.aria-label]="'healthConnect.roster.calendar.weekGrid' | translate">
      <thead>
        <tr>
          <th scope="col" class="w-20 border-b border-hpd-border px-1 py-2 md:w-28">
            <span class="sr-only">{{ 'healthConnect.roster.shift' | translate }}</span>
          </th>
          @for (column of columns(); track column.date) {
            <th
              scope="col"
              class="border border-hpd-border px-1 py-2 text-center align-top"
              [class]="column.classes"
              [attr.data-cy]="'weekday-' + column.date"
              [attr.aria-current]="column.isToday ? 'date' : null"
            >
              <span class="sr-only">{{ column.descriptionKey | translate: column.descriptionParams }}</span>
              <span aria-hidden="true" class="flex flex-col items-center gap-0.5">
                <span class="text-[11px] font-bold uppercase tracking-wider">{{ column.weekdayShort }}</span>
                <span
                  class="text-xs font-semibold"
                  [class.rounded-full]="column.isToday"
                  [class.bg-hpd-primary]="column.isToday"
                  [class.text-white]="column.isToday"
                  [class.px-1.5]="column.isToday"
                >
                  {{ column.dayOfMonth }}
                </span>
                @if (column.day.absence) {
                  <span class="truncate text-[10px] font-semibold uppercase tracking-wide">
                    {{ 'healthConnect.roster.calendar.absenceTypes.' + column.day.absence.type | translate }}
                  </span>
                }
                @if (column.glyph) {
                  <span class="text-[10px] leading-none">{{ column.glyph }}</span>
                }
              </span>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of shiftRows(); track row.shift) {
          <tr>
            <th
              scope="row"
              class="border border-hpd-border bg-hpd-cream px-2 py-2 text-left align-middle text-[11px] font-bold text-hpd-muted"
            >
              {{ 'healthConnect.roster.calendar.shiftShort.' + row.shift | translate }}
              <span class="block text-[10px] font-normal text-hpd-subtle">
                {{ 'healthConnect.roster.calendar.shiftWindow.' + row.shift | translate }}
              </span>
            </th>
            @for (cell of row.cells; track cell.date) {
              <td
                class="h-10 border border-hpd-border p-1 text-center align-middle"
                [class]="cell.classes"
                [attr.data-cy]="'shift-' + row.shift + '-' + cell.date"
              >
                @if (cell.assigned) {
                  <span class="sr-only">
                    {{ 'healthConnect.roster.calendar.a11y.shiftAssigned' | translate: { shift: shiftNames()[row.shift] ?? row.shift } }}
                  </span>
                  <span aria-hidden="true" class="text-xs font-bold">●</span>
                } @else {
                  <span class="sr-only">{{ 'healthConnect.roster.calendar.a11y.shiftFree' | translate }}</span>
                }
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekGridComponent {
  /** Any date inside the week to render. */
  readonly anchorDate = input.required<string>();
  readonly days = input.required<Map<string, RosterDay>>();
  readonly today = input.required<string>();
  readonly locale = input<string>('en');
  readonly shiftNames = input<Record<string, string | undefined>>({});
  readonly toneNames = input<Record<string, string | undefined>>({});

  readonly shiftRows = computed<ShiftRow[]>(() => {
    const columns = this.columns();
    return SHIFT_ROWS.map(shift => ({
      shift,
      cells: columns.map(column => ({
        date: column.date,
        assigned: column.day.shifts.includes(shift),
        // The matrix cell takes the day's tone too, so a column reads as one block of colour rather
        // than a coloured header sitting above seven neutral squares.
        classes: column.classes,
        isToday: column.isToday,
      })),
    }));
  });

  readonly columns = computed<WeekColumn[]>(() => {
    const short = new Intl.DateTimeFormat(this.locale(), { weekday: 'short', timeZone: 'UTC' });
    const longDate = new Intl.DateTimeFormat(this.locale(), { dateStyle: 'long', timeZone: 'UTC' });
    const days = this.days();
    const today = this.today();

    return isoWeekDays(this.anchorDate()).map(date => {
      const day = days.get(date) ?? { date, shifts: [], absence: null };
      const shiftNames = day.shifts.map(shift => this.shiftNames()[shift] ?? shift).join(', ');
      const toneName = day.absence ? this.toneNames()[day.absence.type] ?? day.absence.type : '';
      const utc = new Date(`${date}T00:00:00Z`);
      const description = cellDescription(day, longDate.format(utc), shiftNames, toneName);
      return {
        date,
        weekdayShort: short.format(utc),
        dayOfMonth: Number(date.slice(8, 10)),
        isToday: date === today,
        day,
        classes: cellClasses(day),
        glyph: cellGlyph(day),
        descriptionKey: description.key,
        descriptionParams: description.params,
      };
    });
  });
}
