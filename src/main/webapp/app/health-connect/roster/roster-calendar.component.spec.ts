import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { advanceTo, clear } from 'jest-date-mock';
import { of, throwError } from 'rxjs';

import { AbsenceApiService, AbsenceDto } from '../api/absence-api.service';
import { DutyRosterAssignmentDto, DutyRosterAssignmentsService } from '../api/duty-roster-assignments.service';
import { GeographicSpaceApiService } from '../api/geographic-space-api.service';
import { RosterCalendarComponent } from './roster-calendar.component';

/**
 * The calendar shell (docs/duty-roster.md § 9, DR5): month and week views, navigation, the range it
 * fetches, and the legend.
 *
 * <p>The cases worth having are the ones that pass a casual look: that the month view fetches the
 * *grid's* span rather than the month's, that paging a month from the 31st does not skip a month, and
 * that an unreachable roster says so where an unreachable absence endpoint does not.
 */
describe('RosterCalendarComponent (DR5)', () => {
  let fixture: ComponentFixture<RosterCalendarComponent>;
  let component: RosterCalendarComponent;
  let range: jest.Mock;
  let mine: jest.Mock;
  let summary: jest.Mock;

  const assignment = (partial: Partial<DutyRosterAssignmentDto>): DutyRosterAssignmentDto => ({
    id: 'a-1',
    date: '2026-08-21',
    duty: 'NURSE',
    professionalId: 'prof-1',
    shift: 'DAY',
    name: 'Ward 3',
    ...partial,
  });

  const absence = (partial: Partial<AbsenceDto>): AbsenceDto => ({
    id: 'ab-1',
    fromDate: '2026-08-24',
    toDate: '2026-08-26',
    type: 'HOLIDAY',
    status: 'APPROVED',
    ...partial,
  });

  const build = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [RosterCalendarComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DutyRosterAssignmentsService, useValue: { range, summary } },
        { provide: AbsenceApiService, useValue: { mine } },
        // The day popup resolves each round's area from hc-admin. Stubbed here because this suite
        // is about the calendar rather than the popup's contents, and the real client would want an
        // HttpClient this TestBed does not provide. `of(null)` is what a round with no
        // geographicSpaceId gets, which is every round in this suite's fixtures.
        { provide: GeographicSpaceApiService, useValue: { name: () => of(null) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RosterCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    // Pin "now" — every default the component takes is derived from today, so without this the
    // fixture's dates drift out of the rendered month and half these assertions pass only in August.
    advanceTo(new Date(2026, 7, 21, 9, 0));
    range = jest.fn(() => of([assignment({})]));
    mine = jest.fn(() => of([absence({})]));
    summary = jest.fn(() => of([{ date: '2026-03-04', shifts: ['DAY'], visits: 2, absence: null }]));
  });

  afterEach(() => clear());

  it('opens on the current month and fetches the whole visible grid, not just the month', async () => {
    await build();

    // August 2026 begins on a Saturday, so the grid starts on Monday 27 July. Fetching "2026-08-01
    // to 2026-08-31" would leave the first row empty for days that do have shifts on them.
    expect(range).toHaveBeenCalledWith('2026-07-27', '2026-09-06');
    expect(mine).toHaveBeenCalledWith('2026-07-27', '2026-09-06');
    expect(component.visibleRange()).toEqual({ from: '2026-07-27', to: '2026-09-06' });
  });

  it('renders the month grid with the ISO week-number column', async () => {
    await build();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('hpd-month-grid')).not.toBeNull();
    expect(element.querySelector('hpd-week-grid')).toBeNull();
    // Week 31 is the week of Monday 27 July 2026 — the grid's first row.
    expect(element.querySelectorAll('tbody th').item(0).textContent).toContain('31');
    expect(element.querySelector('[data-cy="day-2026-08-21"]')).not.toBeNull();
  });

  it('switches to the week view and narrows the fetch to seven days', async () => {
    await build();
    range.mockClear();
    mine.mockClear();

    component.view.set('week');
    fixture.detectChanges();

    expect(range).toHaveBeenCalledWith('2026-08-17', '2026-08-23');
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('hpd-week-grid')).not.toBeNull();
    expect(element.querySelector('hpd-month-grid')).toBeNull();
    // Shifts down: four rows, one per shift, FLEXIBLE last and in its own row (§ 9).
    expect(element.querySelector('[data-cy="shift-FLEXIBLE-2026-08-17"]')).not.toBeNull();
    expect(element.querySelector('[data-cy="shift-DAY-2026-08-21"]')).not.toBeNull();
  });

  describe('navigation', () => {
    it('steps a month at a time in month view', async () => {
      await build();
      component.step(1);
      fixture.detectChanges();
      expect(component.anchor()).toBe('2026-09-21');

      component.step(-1);
      fixture.detectChanges();
      expect(component.anchor()).toBe('2026-08-21');
    });

    it('steps a week at a time in week view', async () => {
      await build();
      component.view.set('week');
      component.step(1);
      fixture.detectChanges();
      expect(component.anchor()).toBe('2026-08-28');
    });

    it('does not skip a month when paging from a 31st', async () => {
      // The classic: setMonth on the 31st rolls into the month after next, so "next" from 31 March
      // lands in May and April never renders. addMonths clamps instead.
      await build();
      component.anchor.set('2026-03-31');
      fixture.detectChanges();
      component.step(1);
      expect(component.anchor()).toBe('2026-04-30');
    });

    it('returns to today', async () => {
      await build();
      component.step(3);
      component.goToday();
      fixture.detectChanges();
      expect(component.anchor()).toBe('2026-08-21');
      expect(component.today()).toBe('2026-08-21');
    });
  });

  describe('failure', () => {
    it('says so when the roster read fails', async () => {
      // A calendar that silently shows no shifts is worse than one that admits it could not load
      // them — a clinician would read the empty grid as "nothing rostered" and not turn up.
      range = jest.fn(() => throwError(() => new Error('boom')));
      await build();

      expect(component.failed()).toBe(true);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-cy="calendarError"]')).not.toBeNull();
    });

    it('stays silent when only the absence read fails', async () => {
      // Absences decorate; rounds inform. AbsenceApiService swallows its own errors by contract, so
      // this is the shape the component actually sees — an empty list, not an error.
      mine = jest.fn(() => of([]));
      await build();

      expect(component.failed()).toBe(false);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-cy="calendarError"]')).toBeNull();
      expect(component.days().get('2026-08-21')!.shifts).toEqual(['DAY']);
    });
  });

  it('expands an absence range onto every day it covers', async () => {
    await build();
    expect(component.days().get('2026-08-24')!.absence).toEqual({ type: 'HOLIDAY', status: 'APPROVED' });
    expect(component.days().get('2026-08-26')!.absence).toEqual({ type: 'HOLIDAY', status: 'APPROVED' });
    expect(component.days().get('2026-08-27')!.absence).toBeNull();
  });

  it('renders a legend naming every state that takes a fill, plus pending and off', async () => {
    // Not decoration: the four tints measure 1.02–1.10 against each other, so they are distinguished
    // by hue alone and are one colour in greyscale. The legend is part of how the calendar is read.
    await build();
    const legend = (fixture.nativeElement as HTMLElement).querySelector('[data-cy="calendarLegend"]')!;

    expect(legend).not.toBeNull();
    for (const key of ['working', 'holiday', 'sick', 'other', 'pending', 'off']) {
      expect(legend.textContent).toContain(`healthConnect.roster.calendar.tones.${key}`);
    }
  });

  describe('the day popup (DR6)', () => {
    it('is absent until a cell is activated, then opens for that day', async () => {
      await build();
      expect((fixture.nativeElement as HTMLElement).querySelector('hpd-day-list')).toBeNull();

      // The cell is a real <button>, so it is reachable by Tab and activates on Enter and Space
      // without any of that being re-implemented.
      const cell = (fixture.nativeElement as HTMLElement).querySelector('[data-cy="day-2026-08-21"]') as HTMLButtonElement;
      expect(cell.tagName).toBe('BUTTON');
      cell.click();
      fixture.detectChanges();

      expect(component.openDate()).toBe('2026-08-21');
      expect((fixture.nativeElement as HTMLElement).querySelector('hpd-day-list')).not.toBeNull();
    });

    it('opens from a week-view column header too', async () => {
      await build();
      component.view.set('week');
      fixture.detectChanges();

      ((fixture.nativeElement as HTMLElement).querySelector('[data-cy="weekday-2026-08-19"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.openDate()).toBe('2026-08-19');
    });

    it('destroys the popup on close, so the next day opens clean', async () => {
      // The day read happens on create, and the trail panels live on the popup — carrying either
      // into the next day the reader picks would show one day's customers under another's heading.
      await build();
      component.openDay('2026-08-21');
      fixture.detectChanges();
      component.closeDay();
      fixture.detectChanges();

      expect(component.openDate()).toBeNull();
      expect((fixture.nativeElement as HTMLElement).querySelector('hpd-day-list')).toBeNull();
    });
  });

  describe('the year view (DR7)', () => {
    it('reads the summary endpoint rather than a year of range reads', async () => {
      // The summary already resolves each day's absence server-side, including the range-to-days
      // expansion and the APPROVED-beats-REQUESTED rule. Joining 365 days of assignments against
      // every absence record client-side would be a much larger payload for an answer the server
      // already computes, and a second implementation of a rule that must not drift.
      await build();
      range.mockClear();
      mine.mockClear();

      component.view.set('year');
      fixture.detectChanges();

      expect(summary).toHaveBeenCalledWith(2026);
      expect(range).not.toHaveBeenCalled();
      expect(mine).not.toHaveBeenCalled();
      expect((fixture.nativeElement as HTMLElement).querySelector('hpd-year-grid')).not.toBeNull();
    });

    it('titles itself with the year and steps a year at a time', async () => {
      await build();
      component.view.set('year');
      fixture.detectChanges();
      expect(component.title()).toBe('2026');

      component.step(1);
      fixture.detectChanges();
      expect(component.anchorYear()).toBe(2027);
      expect(summary).toHaveBeenCalledWith(2027);

      component.step(-2);
      fixture.detectChanges();
      expect(component.anchorYear()).toBe(2025);
    });

    it('steps by twelve months rather than 365 days, so a leap year does not drift the anchor', async () => {
      // 2028 is a leap year. Adding 365 days twice would land on 30 December 2027 and then drift
      // again; addMonths clamps and stays on the same day-of-month.
      await build();
      component.view.set('year');
      component.anchor.set('2027-08-21');
      fixture.detectChanges();

      component.step(1);
      expect(component.anchor()).toBe('2028-08-21');
      component.step(1);
      expect(component.anchor()).toBe('2029-08-21');
    });

    it('opens the same day popup the month and week views open', async () => {
      await build();
      component.view.set('year');
      fixture.detectChanges();

      ((fixture.nativeElement as HTMLElement).querySelector('[data-cy="yearDay-2026-03-04"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.openDate()).toBe('2026-03-04');
      expect((fixture.nativeElement as HTMLElement).querySelector('hpd-day-list')).not.toBeNull();
    });

    it('reports a failed summary read the same way a failed range read is reported', async () => {
      summary = jest.fn(() => throwError(() => new Error('boom')));
      await build();

      component.view.set('year');
      fixture.detectChanges();

      expect(component.failed()).toBe(true);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-cy="calendarError"]')).not.toBeNull();
    });
  });

  it('never builds a Tailwind class name at runtime', async () => {
    // Tailwind v4 finds classes by scanning source text, so an assembled name is one it never emits
    // — the swatch renders transparent and nothing fails. This repo already lost that bet once,
    // which is why content/css/tailwind.css carries an explicit @source directive.
    await build();
    expect(component.legendSwatchClass('working')).toBe('bg-hpd-roster-working');
    expect(component.legendSwatchClass('sick')).toBe('bg-hpd-roster-sick');
  });
});
