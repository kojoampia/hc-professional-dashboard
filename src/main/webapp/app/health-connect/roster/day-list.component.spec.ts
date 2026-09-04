import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { DutyRosterAssignmentDto, DutyRosterAssignmentsService, VisitDto } from '../api/duty-roster-assignments.service';
import { GeographicSpaceApiService } from '../api/geographic-space-api.service';
import { DayListComponent } from './day-list.component';

/**
 * The day popup (docs/duty-roster.md §§ 4–7, DR6).
 *
 * <p>The cases that matter are the three that look like something else: a cleared 90-day snapshot,
 * which is an ordinary state and not a loading failure; a 403 on the trail, which is not an empty
 * list; and the visit ordering, which the server does not promise.
 */
describe('DayListComponent (DR6)', () => {
  let fixture: ComponentFixture<DayListComponent>;
  let component: DayListComponent;
  let day: jest.Mock;
  let customerTrail: jest.Mock;
  let spaceName: jest.Mock;

  const visit = (partial: Partial<VisitDto>): VisitDto => ({
    id: 'v-1',
    customerId: 'patient-7',
    startTime: '09:00',
    endTime: '10:00',
    customerName: 'Akosua Mensah',
    customerAddress: 'GA-123-4567, 5 Ankobra River Street, Osu, Greater Accra',
    customerPhone: '0244000111',
    ...partial,
  });

  const round = (partial: Partial<DutyRosterAssignmentDto>): DutyRosterAssignmentDto => ({
    id: 'r-1',
    date: '2026-08-21',
    duty: 'NURSE',
    professionalId: 'prof-1',
    shift: 'DAY',
    name: 'Ward 3',
    visits: [visit({})],
    ...partial,
  });

  const build = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [DayListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DutyRosterAssignmentsService, useValue: { day, customerTrail } },
        // Stubbed rather than left to the real client, which would reach hc-admin through the
        // gateway. `spaceName` is a jest.fn so the area cases below can vary it; by default it
        // answers null, which is what a round with no geographicSpaceId gets and is the shape every
        // pre-existing case here was written against.
        { provide: GeographicSpaceApiService, useValue: { name: (id?: string | null) => spaceName(id) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DayListComponent);
    fixture.componentRef.setInput('date', '2026-08-21');
    fixture.componentRef.setInput('heading', 'Friday, 21 August 2026');
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const element = (): HTMLElement => fixture.nativeElement;

  beforeEach(() => {
    day = jest.fn(() => of([round({})]));
    spaceName = jest.fn(() => of(null));
    customerTrail = jest.fn(() =>
      of([
        { id: 'e-1', occurredAt: '2026-08-20', label: 'visit', title: 'Dressing changed', description: 'Clean', createdAt: '2026-08-20' },
      ]),
    );
  });

  it('reads its own day rather than reusing what the calendar holds', async () => {
    // The range read draws shift names and never receives a customer; shipping six weeks of
    // addresses to a browser to render coloured squares is the leak § 6 warns about.
    await build();
    expect(day).toHaveBeenCalledWith('2026-08-21');
  });

  it('lists a visit with its times and customer', async () => {
    await build();
    const text = element().textContent!;
    expect(text).toContain('09:00');
    expect(text).toContain('Akosua Mensah');
    expect(text).toContain('GA-123-4567, 5 Ankobra River Street, Osu, Greater Accra');
    expect(element().querySelector('a[href="tel:0244000111"]')).not.toBeNull();
  });

  it('orders visits by the hour, not by the order the server returned them', async () => {
    // fix.md asks for "ordered by the hour and customer". Nothing on the server promises an order,
    // and a round read back in insertion order sends a clinician up and down the same street.
    day = jest.fn(() =>
      of([
        round({
          visits: [
            visit({ id: 'v-late', startTime: '14:00', endTime: '15:00', customerName: 'Zita' }),
            visit({ id: 'v-early', startTime: '08:00', endTime: '09:00', customerName: 'Ama' }),
          ],
        }),
      ]),
    );
    await build();
    expect(component.rounds()[0].visits.map(v => v.startTime)).toEqual(['08:00', '14:00']);
  });

  it('breaks a tie at the same minute by customer, so the order is stable', async () => {
    day = jest.fn(() =>
      of([
        round({
          visits: [
            visit({ id: 'v-b', startTime: '09:00', customerName: 'Zita' }),
            visit({ id: 'v-a', startTime: '09:00', customerName: 'Ama' }),
          ],
        }),
      ]),
    );
    await build();
    expect(component.rounds()[0].visits.map(v => v.customerName)).toEqual(['Ama', 'Zita']);
  });

  it('says the details are no longer held when the 90-day sweep has cleared the snapshot', async () => {
    // An ordinary state, not a failure: the sweep clears name, address and phone and keeps the id,
    // so an old round has times and no customer. A blank line would read as a bug.
    day = jest.fn(() => of([round({ visits: [visit({ customerName: null, customerAddress: null, customerPhone: null })] })]));
    await build();
    expect(element().querySelector('[data-cy="noSnapshot-patient-7"]')).not.toBeNull();
  });

  it('shows a shift with no visits as an ordinary shift', async () => {
    // Ward cover, on call, administrative time — § 4 says a round with no visits is still valid.
    day = jest.fn(() => of([round({ visits: [] })]));
    await build();
    expect(element().querySelector('[data-cy="roundWithoutVisits"]')).not.toBeNull();
  });

  it('reports a day that could not be read instead of showing it as empty', async () => {
    day = jest.fn(() => throwError(() => new Error('boom')));
    await build();
    expect(element().querySelector('[data-cy="dayError"]')).not.toBeNull();
    expect(element().querySelector('[data-cy="dayEmpty"]')).toBeNull();
  });

  describe('the activity trail', () => {
    it('is fetched on expand, not with the day', async () => {
      // A round may hold half a dozen customers and the trail is a cross-stack read each. Loading
      // all of them to show one is the burst § 6 warns about, in the one place nobody asked for it.
      await build();
      expect(customerTrail).not.toHaveBeenCalled();

      component.toggleTrail('patient-7');
      fixture.detectChanges();

      expect(customerTrail).toHaveBeenCalledWith('patient-7');
      expect(element().querySelector('[data-cy="trail-patient-7"]')!.textContent).toContain('Dressing changed');
    });

    it('renders a 403 as a boundary, never as an empty trail', async () => {
      // The specific mistake § 7 calls out. "Nothing happened this week" and "you may not look" are
      // different answers, and collapsing the second into the first hides an authorization failure
      // behind a plausible blank panel.
      customerTrail = jest.fn(() => throwError(() => new HttpErrorResponse({ status: 403 })));
      await build();

      component.toggleTrail('patient-7');
      fixture.detectChanges();

      expect(component.trailFor('patient-7').state).toBe('forbidden');
      expect(element().querySelector('[data-cy="trailForbidden-patient-7"]')).not.toBeNull();
    });

    it('distinguishes a read failure from a refusal', async () => {
      customerTrail = jest.fn(() => throwError(() => new HttpErrorResponse({ status: 500 })));
      await build();

      component.toggleTrail('patient-7');
      fixture.detectChanges();

      expect(component.trailFor('patient-7').state).toBe('error');
    });

    it('collapses on a second toggle and re-reads on the next expand', async () => {
      // Closing discards the panel, so reopening re-reads — the right way round for data whose whole
      // purpose is to be current.
      await build();

      component.toggleTrail('patient-7');
      component.toggleTrail('patient-7');
      fixture.detectChanges();
      expect(component.isTrailOpen('patient-7')).toBe(false);

      component.toggleTrail('patient-7');
      expect(customerTrail).toHaveBeenCalledTimes(2);
    });

    it('does not reopen a panel the reader collapsed before the response landed', async () => {
      let emit: ((entries: unknown[]) => void) | null = null;
      customerTrail = jest.fn(
        () =>
          new (class {
            subscribe(observer: { next: (v: unknown[]) => void }): { unsubscribe: () => void } {
              emit = observer.next.bind(observer);
              return { unsubscribe: () => undefined };
            }
          })() as never,
      );
      await build();

      component.toggleTrail('patient-7');
      component.toggleTrail('patient-7');
      emit!([{ id: 'e-1' }]);
      fixture.detectChanges();

      expect(component.isTrailOpen('patient-7')).toBe(false);
    });
  });

  it('takes focus when it opens', async () => {
    // A modal that opens without taking focus leaves a keyboard user outside it, tabbing through the
    // calendar behind a backdrop they cannot see — and the focus trap only helps once focus is in.
    await build();
    expect(document.activeElement).toBe(element().querySelector('[role="dialog"]'));
  });

  it('closes on the backdrop but not on a click inside the dialog', async () => {
    await build();
    const closed = jest.fn();
    component.closed.subscribe(closed);

    const backdrop = element().querySelector('[data-cy="dayPopup"]') as HTMLElement;
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(closed).toHaveBeenCalledTimes(1);

    (element().querySelector('[data-cy="dayRound-r-1"]') as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(closed).toHaveBeenCalledTimes(1);
  });

  /**
   * The round's area, resolved from hc-admin's narrow geographic read.
   *
   * <p>`geographicSpaceId` is opaque in this product — stored, returned, never interpreted — so the
   * name has to come from the service that owns the tree. What these cases pin is the direction the
   * lookup fails in: a round is readable without an area, and hc-admin being unreachable must cost
   * a label rather than a round.
   */
  describe('the round area', () => {
    it('shows the name hc-admin gives for the round space', async () => {
      day = jest.fn(() => of([round({ geographicSpaceId: 'space-osu' })]));
      spaceName = jest.fn(() => of('Osu'));
      await build();

      expect(spaceName).toHaveBeenCalledWith('space-osu');
      expect(element().querySelector('[data-cy="roundArea-r-1"]')?.textContent).toContain('Osu');
    });

    it('shows nothing when the round carries no space', async () => {
      day = jest.fn(() => of([round({ geographicSpaceId: null })]));
      await build();

      expect(element().querySelector('[data-cy="roundArea-r-1"]')).toBeNull();
    });

    /**
     * hc-admin unreachable is an absent label, not an error and not a stall.
     *
     * <p>The client answers null on failure by contract. The round beneath it — the shift, the
     * times, the customer at the door — comes from this service and is the information a clinician
     * is actually standing there needing.
     */
    it('shows nothing rather than an error when hc-admin cannot be reached', async () => {
      day = jest.fn(() => of([round({ geographicSpaceId: 'space-osu' })]));
      spaceName = jest.fn(() => of(null));
      await build();

      expect(element().querySelector('[data-cy="roundArea-r-1"]')).toBeNull();
      expect(element().querySelector('[data-cy="dayRound-r-1"]')).not.toBeNull();
      expect(element().querySelector('[data-cy="dayError"]')).toBeNull();
    });
  });
});
