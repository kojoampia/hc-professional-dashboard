import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { RosterDay } from './roster-day.model';
import { YearGridComponent } from './year-grid.component';

/**
 * The year view (docs/duty-roster.md §§ 9–10, DR7): twelve mini-month grids.
 *
 * <p>The cases worth having are the boundary ones. **The layout is what closed open question 1**, so
 * the December/January seam is asserted from both sides; and a year view that disagreed with the
 * month view about a single day would be the kind of thing nobody reports and everybody distrusts, so
 * the shared tone mapping is asserted too.
 */
describe('YearGridComponent (DR7)', () => {
  let fixture: ComponentFixture<YearGridComponent>;
  let component: YearGridComponent;

  const day = (date: string, partial: Partial<RosterDay> = {}): [string, RosterDay] => [
    date,
    { date, shifts: [], absence: null, ...partial },
  ];

  const build = async (year: number, days: Map<string, RosterDay> = new Map(), today = '2026-08-21'): Promise<void> => {
    await TestBed.configureTestingModule({ imports: [YearGridComponent, TranslateModule.forRoot()] }).compileComponents();
    fixture = TestBed.createComponent(YearGridComponent);
    fixture.componentRef.setInput('year', year);
    fixture.componentRef.setInput('days', days);
    fixture.componentRef.setInput('today', today);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const element = (): HTMLElement => fixture.nativeElement;

  it('draws twelve months', async () => {
    await build(2026);
    expect(element().querySelectorAll('[data-cy^="yearMonth-"]')).toHaveLength(12);
    expect(component.months().map(m => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('renders every day of the year exactly once, and no day from a neighbouring year', async () => {
    // The property that makes the layout answer open question 1: a week is not a unit here, so the
    // boundary week's days appear only in the month that owns them.
    await build(2026);
    const dates = component
      .months()
      .flatMap(month => month.weeks.flat())
      .filter(cell => cell.inMonth)
      .map(cell => cell.date);

    expect(new Set(dates).size).toBe(dates.length);
    expect(dates).toHaveLength(365);
    expect(dates.every(date => date.startsWith('2026-'))).toBe(true);
    expect(dates[0]).toBe('2026-01-01');
    expect(dates[dates.length - 1]).toBe('2026-12-31');
  });

  it('counts 366 days in a leap year', async () => {
    await build(2028);
    const dates = component
      .months()
      .flatMap(month => month.weeks.flat())
      .filter(cell => cell.inMonth)
      .map(cell => cell.date);
    expect(dates).toHaveLength(366);
    expect(dates).toContain('2028-02-29');
  });

  describe('the year boundary, which is why this layout was chosen', () => {
    it('does not render 29–31 December of the previous year as days of January', async () => {
      // 1 January 2026 is a Thursday, so its ISO week begins on 29 December 2025. Under a
      // week-column layout that week would have to be filed under one year or the other; here it is
      // padding in January's first row and a real day in December 2025's own grid.
      await build(2026);
      const january = component.months()[0];
      const firstRow = january.weeks[0];

      expect(firstRow.filter(cell => cell.inMonth).map(cell => cell.date)).toEqual([
        '2026-01-01',
        '2026-01-02',
        '2026-01-03',
        '2026-01-04',
      ]);
      expect(firstRow.filter(cell => !cell.inMonth)).toHaveLength(3);
      expect(element().querySelector('[data-cy="yearDay-2025-12-29"]')).toBeNull();
    });

    it('does not render early January of the next year as days of December', async () => {
      // The mirror image: 31 December 2026 is a Thursday, so its week runs into 3 January 2027.
      await build(2026);
      const december = component.months()[11];
      const lastRow = december.weeks[december.weeks.length - 1];

      expect(lastRow.some(cell => cell.inMonth && cell.date === '2026-12-31')).toBe(true);
      expect(element().querySelector('[data-cy="yearDay-2027-01-01"]')).toBeNull();
    });

    it('renders a padding cell as an inert table cell, not a button', async () => {
      // A neighbouring month's date rendered here would be clickable in two grids at once and
      // countable twice.
      await build(2026);
      const januaryCells = element().querySelector('[data-cy="yearMonth-1"] tbody tr')!.querySelectorAll('td');
      expect(januaryCells.item(0).querySelector('button')).toBeNull();
      expect(januaryCells.item(3).querySelector('button')).not.toBeNull();
    });
  });

  it('never leaves a blank sixth row', async () => {
    // February 2027 is exactly four weeks starting on a Monday — the shortest a month grid gets.
    await build(2027);
    expect(component.months().every(month => month.weeks.every(week => week.some(cell => cell.inMonth)))).toBe(true);
    expect(component.months()[1].weeks).toHaveLength(4);
  });

  it('paints a day from the same tone mapping the month and week grids use', async () => {
    await build(
      2026,
      new Map([
        day('2026-03-04', { shifts: ['DAY'] }),
        day('2026-03-05', { absence: { type: 'HOLIDAY', status: 'APPROVED' } }),
        day('2026-03-06', { absence: { type: 'SICK', status: 'REQUESTED' } }),
      ]),
    );

    const classesFor = (date: string): string => element().querySelector(`[data-cy="yearDay-${date}"]`)!.className;
    expect(classesFor('2026-03-04')).toContain('bg-hpd-roster-working');
    expect(classesFor('2026-03-05')).toContain('bg-hpd-roster-holiday');
    expect(classesFor('2026-03-06')).toContain('bg-hpd-roster-sick');
    // Requested, not granted — hatched, exactly as in the other two views.
    expect(classesFor('2026-03-06')).toContain('hpd-roster-pending');
    // A day the summary did not mention is off, and off takes no fill.
    expect(classesFor('2026-03-07')).not.toContain('bg-hpd-roster');
  });

  it('emits the day a reader picks', async () => {
    await build(2026);
    const picked: string[] = [];
    component.daySelected.subscribe(date => picked.push(date));

    (element().querySelector('[data-cy="yearDay-2026-08-21"]') as HTMLButtonElement).click();
    expect(picked).toEqual(['2026-08-21']);
  });

  it('marks today', async () => {
    await build(2026, new Map(), '2026-08-21');
    const todayCell = element().querySelector('[data-cy="yearDay-2026-08-21"]')!;
    expect(todayCell.closest('td')!.getAttribute('aria-current')).toBe('date');
  });
});
