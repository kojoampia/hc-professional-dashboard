import { RosterDay, RosterDayTone, isPending, toneOf } from './roster-day.model';

/**
 * The class list and the accessible description for one rendered day, shared by both grids
 * (docs/duty-roster.md § Colour, DR5).
 *
 * <p>Both grids paint the same five tones and must paint them identically — a month cell and a week
 * cell showing the same date in different colours is the kind of thing nobody reports and everybody
 * distrusts. Keeping the mapping here rather than in two templates is what makes that structural
 * rather than a matter of care.
 */

/**
 * Tailwind classes per tone. `off` gets no fill: the page is cream, so an empty day is the page
 * showing through, and a fill always means something is true.
 *
 * <p>The `text-*` half is not decoration. `.hpd-roster-pending` draws its hatch in `currentColor`,
 * so the tone's accent is what gives the stripes their colour — a cell with a fill and no text
 * colour hatches in near-black.
 */
const TONE_CLASSES: Record<RosterDayTone, string> = {
  working: 'bg-hpd-roster-working text-hpd-roster-working-accent',
  holiday: 'bg-hpd-roster-holiday text-hpd-roster-holiday-accent',
  sick: 'bg-hpd-roster-sick text-hpd-roster-sick-accent',
  other: 'bg-hpd-roster-other text-hpd-roster-other-accent',
  off: 'text-hpd-muted',
};

/** Translation key for the tone's legend entry and cell label. */
export const toneLabelKey = (tone: RosterDayTone): string => `healthConnect.roster.calendar.tones.${tone}`;

/**
 * A glyph per tone, because colour is never the only channel (§ Colour) and the measured tints are
 * luminance-identical to the page background — in greyscale the fills simply are not there.
 *
 * <p>Deliberately punctuation rather than emoji: emoji render at wildly different sizes across
 * platforms, are announced verbosely by screen readers, and pick up their own colour, which would
 * fight the tone. These are marked `aria-hidden` in the templates — the spoken channel is the cell's
 * own label, not a symbol name.
 */
const TONE_GLYPHS: Record<RosterDayTone, string> = {
  working: '●', // ● filled — a day with work on it
  holiday: '▲', // ▲ — distinct in shape, not just hue
  sick: '✖', // ✖
  other: '◆', // ◆
  off: '',
};

export const cellClasses = (day: RosterDay): string => {
  const tone = toneOf(day);
  return `${TONE_CLASSES[tone]}${isPending(day) ? ' hpd-roster-pending' : ''}`;
};

export const cellGlyph = (day: RosterDay): string => TONE_GLYPHS[toneOf(day)];

/**
 * The translation key and parameters for a cell's accessible name.
 *
 * <p>This is the channel that actually carries the day to a screen reader, and the only one that
 * survives greyscale, colour blindness and a 24-pixel month cell at once. It says the date, then
 * what is on it, then whether leave is granted or merely asked for — in that order, because a reader
 * arrowing across a week wants the date first.
 */
export interface CellDescription {
  key: string;
  params: Record<string, string>;
}

export const cellDescription = (day: RosterDay, formattedDate: string, shiftNames: string, toneName: string): CellDescription => {
  if (day.absence) {
    return {
      key: isPending(day)
        ? 'healthConnect.roster.calendar.a11y.dayAbsenceRequested'
        : 'healthConnect.roster.calendar.a11y.dayAbsenceApproved',
      // The shifts still go in: leave over a shift that has not been reassigned is the conflict DR4
      // refuses to approve, and a reader must not have to compare two views to notice it.
      params: { date: formattedDate, absence: toneName, shifts: shiftNames },
    };
  }
  if (day.shifts.length > 0) {
    return { key: 'healthConnect.roster.calendar.a11y.dayWorking', params: { date: formattedDate, shifts: shiftNames } };
  }
  return { key: 'healthConnect.roster.calendar.a11y.dayOff', params: { date: formattedDate } };
};

export { isPending, toneOf };
export type { RosterDay, RosterDayTone };
