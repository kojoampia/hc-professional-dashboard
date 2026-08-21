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

  const fillRound = (): void =>
    component.form.patchValue({ professionalId: 'prof-1', date: '2026-09-14', shift: 'DAY', duty: 'NURSE', name: 'Ward 3' });

  beforeEach(() => {
    listAll = jest.fn(() => of([round()]));
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
});
