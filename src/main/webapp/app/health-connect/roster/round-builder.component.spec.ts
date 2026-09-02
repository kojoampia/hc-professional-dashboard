import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AlertService } from 'app/core/util/alert.service';

import { AbsenceApiService, AbsenceDto } from '../api/absence-api.service';
import { DutyRosterAssignmentDto, DutyRosterAssignmentsService } from '../api/duty-roster-assignments.service';
import { RoundBuilderComponent } from './round-builder.component';

/**
 * The roster administrator's write surface (docs/duty-roster.md §§ 4, 8, DR8).
 *
 * <p>Three things carry this component and each has a case here: that a round can be built **with
 * visits**, which the form could not do before DR8 while the backend has carried them since DR2; that
 * approved leave **warns rather than blocks**, which is how open question 4 was settled; and that a
 * round moves whole by default with a single visit as the fallback.
 *
 * <p>A fourth arrived with backlog.md item 13: **the estate list must never silently truncate**. See
 * the paging block at the bottom, and `expectNoSilentTruncation`, which is written as an implication
 * over what the server answered rather than as an expected row count — an expected row count is
 * exactly what passes in the broken state.
 */
describe('RoundBuilderComponent (DR8)', () => {
  let fixture: ComponentFixture<RoundBuilderComponent>;
  let component: RoundBuilderComponent;
  let listAll: jest.Mock;
  let assign: jest.Mock;
  let unassign: jest.Mock;
  let reassignRound: jest.Mock;
  let reassignVisit: jest.Mock;
  let forProfessional: jest.Mock;

  const round = (partial: Partial<DutyRosterAssignmentDto> = {}): DutyRosterAssignmentDto => ({
    id: 'r-1',
    date: '2026-09-14',
    duty: 'NURSE',
    professionalId: 'prof-1',
    shift: 'DAY',
    name: 'Ward 3',
    visits: [{ id: 'v-1', customerId: 'patient-7', startTime: '09:00', endTime: '10:00' }],
    ...partial,
  });

  const leave = (partial: Partial<AbsenceDto> = {}): AbsenceDto => ({
    id: 'ab-1',
    professionalId: 'prof-1',
    fromDate: '2026-09-14',
    toDate: '2026-09-18',
    type: 'HOLIDAY',
    status: 'APPROVED',
    ...partial,
  });

  const build = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [RoundBuilderComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DutyRosterAssignmentsService, useValue: { listAll, assign, unassign, reassignRound, reassignVisit } },
        { provide: AbsenceApiService, useValue: { forProfessional } },
        { provide: AlertService, useValue: { showToast: jest.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RoundBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const element = (): HTMLElement => fixture.nativeElement;

  /**
   * One answer from `GET /api/duty-roster/all`, headers and all.
   *
   * <p>The headers are the whole subject of the paging block: `api/` `058ce46` made this a `Page`, so
   * `X-Total-Count` is the estate's real count and `Link` names the next page. Passing **no** headers
   * models the `/all` deployed today, which takes no `Pageable` and answers with the whole estate —
   * both shapes have to work, and until the api ships only the second one is real.
   */
  const answer = (rows: DutyRosterAssignmentDto[], headers: Record<string, string> = {}): HttpResponse<DutyRosterAssignmentDto[]> =>
    new HttpResponse({ body: rows, headers: new HttpHeaders(headers) });

  /** A page's worth of distinguishable rows, so appending can be told from replacing. */
  const rows = (from: number, count: number): DutyRosterAssignmentDto[] =>
    Array.from({ length: count }, (_value, index) => round({ id: `r-${from + index}` }));

  const link = (nextPage: number): string =>
    `</services/professionalservice/api/duty-roster/all?page=${nextPage}&size=20>; rel="next",` +
    '</services/professionalservice/api/duty-roster/all?page=2&size=20>; rel="last"';

  const renderedRows = (): number => element().querySelectorAll('[data-cy="assignmentRow"]').length;
  const moreNotice = (): HTMLElement | null => element().querySelector('[data-cy="rosterMore"]');

  /**
   * **The invariant item 13 exists for: if fewer rows are on screen than the estate holds, the screen
   * says so.**
   *
   * <p>Phrased as an implication over the count the *server* sent, not over anything the component
   * decided. That distinction is the point of the whole block. A test written as "the first page
   * renders twenty rows" passes in precisely the state item 13 describes — twenty rows and no hint
   * that there are fifty-seven — and so would an implication guarded by `component.totalAssignments()`,
   * because a component that ignored the header would leave it null and make the guard vacuous.
   *
   * <p>The other direction is asserted too: a list that *is* complete must not claim otherwise. An
   * always-on "load more" would satisfy the first half and be a different lie.
   */
  const expectNoSilentTruncation = (estateTotal: number): void => {
    expect(renderedRows()).toBe(component.allAssignments().length);
    if (renderedRows() < estateTotal) {
      expect(moreNotice()).not.toBeNull();
      expect(component.totalAssignments()).toBe(estateTotal);
    } else {
      expect(moreNotice()).toBeNull();
    }
  };

  const fillRound = (): void =>
    component.form.patchValue({ professionalId: 'prof-1', date: '2026-09-14', shift: 'DAY', duty: 'NURSE', name: 'Ward 3' });

  beforeEach(() => {
    listAll = jest.fn(() => of(answer([round()])));
    assign = jest.fn(() => of(round()));
    unassign = jest.fn(() => of(void 0));
    reassignRound = jest.fn(() => of(round({ professionalId: 'prof-2' })));
    reassignVisit = jest.fn(() => of(round({ id: 'r-2', professionalId: 'prof-2' })));
    forProfessional = jest.fn(() => of([]));
  });

  describe('building a round', () => {
    it('sends the visits entered on the form', async () => {
      // Before DR8 the form wrote a bare shift while the backend had carried visits since DR2, so
      // every round created through the UI had none and the day popup had nothing to show.
      await build();
      fillRound();
      component.addVisit();
      component.visits.at(0).setValue({ customerId: 'patient-7', startTime: '09:00', endTime: '10:00' });
      component.assign();

      expect(assign).toHaveBeenCalledWith(
        expect.objectContaining({ visits: [{ customerId: 'patient-7', startTime: '09:00', endTime: '10:00' }] }),
      );
    });

    it('accepts a round with no visits at all', async () => {
      // Ward cover, on call, administrative time — § 4 says a shift with no visits is still a shift.
      await build();
      fillRound();
      component.assign();

      expect(assign).toHaveBeenCalledWith(expect.objectContaining({ visits: [] }));
      expect(element().querySelector('[data-cy="noVisitRows"]')).not.toBeNull();
    });

    it('does not submit until the round itself is complete', async () => {
      await build();
      component.assign();
      expect(assign).not.toHaveBeenCalled();
    });

    it('shows the server’s own rejection verbatim', async () => {
      // It names which of four rules broke — window, ordering, in-round overlap, or a clash with
      // another round — and each has a different fix. Re-implementing the window table here would be
      // a second copy of the NIGHT wrap, the easiest thing in this subsystem to get subtly wrong.
      assign = jest.fn(() => throwError(() => ({ error: 'Visit start 06:00 is outside the DAY window on 2026-09-14' })));
      await build();
      fillRound();
      component.assign();
      fixture.detectChanges();

      expect(element().querySelector('[data-cy="assignError"]')!.textContent).toContain('outside the DAY window');
    });
  });

  describe('approved leave', () => {
    it('warns without blocking, which is how open question 4 was settled', async () => {
      forProfessional = jest.fn(() => of([leave()]));
      await build();
      fillRound();
      fixture.detectChanges();

      expect(forProfessional).toHaveBeenCalledWith('prof-1', '2026-09-14', '2026-09-14');
      expect(element().querySelector('[data-cy="leaveWarning"]')).not.toBeNull();

      // Still assignable: an administrator may legitimately roster somebody over agreed leave, and
      // making that cost a deletion and a re-creation would lose the record of why they were off.
      component.assign();
      expect(assign).toHaveBeenCalled();
    });

    it('ignores leave that is only requested', async () => {
      // Nothing is granted yet, so there is nothing to warn about — and the approval itself will be
      // refused by the 409 while this round exists, which is the other direction of the same rule.
      forProfessional = jest.fn(() => of([leave({ status: 'REQUESTED' })]));
      await build();
      fillRound();
      fixture.detectChanges();

      expect(element().querySelector('[data-cy="leaveWarning"]')).toBeNull();
    });

    it('does not ask until it has both a professional and a date', async () => {
      await build();
      component.form.patchValue({ professionalId: 'prof-1' });
      expect(forProfessional).not.toHaveBeenCalled();
    });

    it('treats a failed lookup as no known leave rather than blocking the form', async () => {
      // This is advice, and the administrator is allowed to proceed regardless.
      forProfessional = jest.fn(() => of([]));
      await build();
      fillRound();
      fixture.detectChanges();
      expect(element().querySelector('[data-cy="leaveWarning"]')).toBeNull();
    });
  });

  describe('reassignment', () => {
    it('moves the whole round by default', async () => {
      // The customers, their times and their order are a coherent plan; splitting them by hand loses
      // it, so § 8 makes the whole round the default and one visit the fallback.
      await build();
      component.toggleReassign('r-1');
      component.reassignTarget.set('prof-2');
      fixture.detectChanges();

      component.reassignRound(round());
      expect(reassignRound).toHaveBeenCalledWith('r-1', 'prof-2');
    });

    it('moves a single visit as the fallback', async () => {
      await build();
      component.toggleReassign('r-1');
      component.reassignTarget.set('prof-2');
      component.reassignVisit(round(), { id: 'v-1', customerId: 'patient-7', startTime: '09:00', endTime: '10:00' });
      expect(reassignVisit).toHaveBeenCalledWith('r-1', 'v-1', 'prof-2');
    });

    it('surfaces a refused reassignment', async () => {
      // A 400 here is a double-booking of the target, or an unknown id — both things the
      // administrator can see and fix by picking someone else, which is why it is not a 409.
      reassignRound = jest.fn(() => throwError(() => ({ error: 'Visit 09:00–10:00 overlaps an existing assignment' })));
      await build();
      component.toggleReassign('r-1');
      component.reassignTarget.set('prof-2');
      component.reassignRound(round());
      fixture.detectChanges();

      expect(element().querySelector('[data-cy="reassignError-r-1"]')!.textContent).toContain('overlaps an existing assignment');
    });

    it('does nothing without a target', async () => {
      await build();
      component.toggleReassign('r-1');
      component.reassignRound(round());
      // The button is disabled, but the guard matters too: an empty target would earn a 400 that
      // reads as a server problem rather than an unfilled field.
      expect(reassignRound).toHaveBeenCalledWith('r-1', '');
    });
  });

  it('unassigns and reloads', async () => {
    await build();
    component.unassign(round());
    expect(unassign).toHaveBeenCalledWith('r-1');
    expect(listAll).toHaveBeenCalledTimes(2);
  });

  /**
   * The estate list, and backlog.md item 13.
   *
   * <p>`GET /api/duty-roster/all` returned every assignment on the estate in one response until `api/`
   * `058ce46` bounded it to a `Page`. This component asked for no page and rendered whatever came
   * back, so the moment that change ships the administrator sees the first twenty rows and nothing at
   * all to say there are more. **A short roster list and a truncated one look the same**, which is
   * why the cases below assert the affordance rather than the row count.
   *
   * <p>Both wire shapes are exercised, because the api change is committed on an unpushed branch and
   * quality still runs the unpaginated `/all`: for a window of time this code has to be right against
   * a server that ignores `page` and `size` entirely.
   */
  describe('paging the estate list (item 13)', () => {
    it('asks for a bounded page instead of the whole estate', async () => {
      await build();
      expect(listAll).toHaveBeenCalledWith(0);
    });

    it('says so when the estate holds more than the page it was given', async () => {
      // The failure this item is about: twenty rows of fifty-seven, and nothing on screen that
      // distinguishes that from a quiet week.
      listAll = jest.fn(() => of(answer(rows(1, 20), { 'X-Total-Count': '57', Link: link(1) })));
      await build();

      expect(renderedRows()).toBe(20);
      expectNoSilentTruncation(57);
      expect(element().querySelector('[data-cy="rosterShowing"]')).not.toBeNull();
      expect(element().querySelector('[data-cy="rosterLoadMore"]')).not.toBeNull();
    });

    it('appends the next page on demand and stops claiming more once it has them all', async () => {
      listAll = jest
        .fn()
        .mockReturnValueOnce(of(answer(rows(1, 20), { 'X-Total-Count': '57', Link: link(1) })))
        .mockReturnValueOnce(of(answer(rows(21, 20), { 'X-Total-Count': '57', Link: link(2) })))
        .mockReturnValueOnce(of(answer(rows(41, 17), { 'X-Total-Count': '57' })));
      await build();

      component.loadMore();
      fixture.detectChanges();
      // Appended, not replaced: the administrator is scanning for a round to move, and swapping the
      // rows underneath them would make finding one a game of chance.
      expect(renderedRows()).toBe(40);
      expect(listAll).toHaveBeenLastCalledWith(1);
      expectNoSilentTruncation(57);

      component.loadMore();
      fixture.detectChanges();
      expect(renderedRows()).toBe(57);
      expect(listAll).toHaveBeenLastCalledWith(2);
      // The list is now complete, so the notice must be gone — an always-on "load more" would pass
      // the first half of the invariant and be a different lie.
      expectNoSilentTruncation(57);
      expect(moreNotice()).toBeNull();
    });

    it('reads an answer with no paging headers as the whole estate, not as a first page', async () => {
      // Backwards compatibility with the `/all` deployed today, which takes no Pageable and drops
      // `page` and `size`. Guessing at a page 1 here would fetch the estate a second time and append
      // it to itself, which is a worse defect than the one being fixed.
      listAll = jest.fn(() => of(answer(rows(1, 57))));
      await build();

      expect(renderedRows()).toBe(57);
      expect(component.totalAssignments()).toBeNull();
      expect(component.hasMore()).toBe(false);
      expectNoSilentTruncation(57);
      expect(listAll).toHaveBeenCalledTimes(1);

      // And the control is not merely hidden — asking for more does nothing at all.
      component.loadMore();
      expect(listAll).toHaveBeenCalledTimes(1);
    });

    it('falls back to the count when a bounded answer carries no Link header', async () => {
      // The two headers can only disagree if something upstream strips one, and the safe reading of a
      // disagreement is the one that offers to load the rows the count says exist.
      listAll = jest
        .fn()
        .mockReturnValueOnce(of(answer(rows(1, 20), { 'X-Total-Count': '57' })))
        .mockReturnValueOnce(of(answer(rows(21, 37), { 'X-Total-Count': '57' })));
      await build();

      expectNoSilentTruncation(57);
      component.loadMore();
      fixture.detectChanges();
      expect(listAll).toHaveBeenLastCalledWith(1);
      expect(renderedRows()).toBe(57);
      expectNoSilentTruncation(57);
    });

    it('returns to the first page after a mutation', async () => {
      // The new round changes where the date-then-shift ordering puts every row after it, so
      // re-requesting page 2 would show a window that no longer means what it did.
      listAll = jest
        .fn()
        .mockReturnValueOnce(of(answer(rows(1, 20), { 'X-Total-Count': '57', Link: link(1) })))
        .mockReturnValueOnce(of(answer(rows(21, 20), { 'X-Total-Count': '57', Link: link(2) })))
        .mockReturnValueOnce(of(answer(rows(1, 20), { 'X-Total-Count': '58', Link: link(1) })));
      await build();
      component.loadMore();
      fixture.detectChanges();
      expect(renderedRows()).toBe(40);

      component.unassign(round());
      fixture.detectChanges();
      expect(listAll).toHaveBeenLastCalledWith(0);
      expect(renderedRows()).toBe(20);
      expectNoSilentTruncation(58);
    });

    it('keeps the rows already on screen when a later page fails, and offers the retry', async () => {
      listAll = jest
        .fn()
        .mockReturnValueOnce(of(answer(rows(1, 20), { 'X-Total-Count': '57', Link: link(1) })))
        .mockReturnValueOnce(throwError(() => ({ status: 500 })));
      await build();

      component.loadMore();
      fixture.detectChanges();
      // Dropping back to an empty list on a failed second page would be the truncation wearing a
      // different hat: twenty rows became none, and nothing said why.
      expect(renderedRows()).toBe(20);
      expect(component.loadingMore()).toBe(false);
      expectNoSilentTruncation(57);
    });

    it('empties the list when the first page fails, as it always did', async () => {
      listAll = jest.fn(() => throwError(() => ({ status: 500 })));
      await build();

      expect(renderedRows()).toBe(0);
      expect(component.totalAssignments()).toBeNull();
      expect(component.hasMore()).toBe(false);
    });
  });
});
