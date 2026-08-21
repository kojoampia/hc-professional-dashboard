import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AlertService } from 'app/core/util/alert.service';

import { AbsenceApiService, AbsenceDto } from '../api/absence-api.service';
import { AbsenceQueueComponent } from './absence-queue.component';

/**
 * The roster administrator's approval queue (docs/duty-roster.md § 8, DR8).
 *
 * <p><b>The 409 is the point of this screen, not an error case in it.</b> Its body names the rounds
 * in the way so cover can be arranged before leave is granted; rendering that as a red "conflict"
 * banner would throw away the only part of the answer that helps.
 */
describe('AbsenceQueueComponent (DR8)', () => {
  let fixture: ComponentFixture<AbsenceQueueComponent>;
  let component: AbsenceQueueComponent;
  let all: jest.Mock;
  let approve: jest.Mock;
  let remove: jest.Mock;

  const absence = (partial: Partial<AbsenceDto>): AbsenceDto => ({
    id: 'ab-1',
    professionalId: 'prof-1',
    fromDate: '2026-09-14',
    toDate: '2026-09-18',
    type: 'HOLIDAY',
    status: 'REQUESTED',
    ...partial,
  });

  const build = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [AbsenceQueueComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AbsenceApiService, useValue: { all, approve, remove } },
        { provide: AlertService, useValue: { showToast: jest.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AbsenceQueueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const element = (): HTMLElement => fixture.nativeElement;

  beforeEach(() => {
    all = jest.fn(() => of([absence({}), absence({ id: 'ab-2', status: 'APPROVED', fromDate: '2026-07-01', toDate: '2026-07-03' })]));
    approve = jest.fn(() => of(absence({ status: 'APPROVED' })));
    remove = jest.fn(() => of(void 0));
  });

  it('opens on pending requests only', async () => {
    // A queue that opens on everything buries the few requests waiting under a year of settled ones.
    await build();
    expect(component.visible().map(a => a.id)).toEqual(['ab-1']);
    expect(element().querySelector('[data-cy="queueItem-ab-2"]')).toBeNull();
  });

  it('shows granted absences when asked, pending still first', async () => {
    // Declining one after the fact is a real thing, so they are reachable.
    await build();
    component.pendingOnly.set(false);
    fixture.detectChanges();
    expect(component.visible().map(a => a.id)).toEqual(['ab-1', 'ab-2']);
  });

  it('approves and reloads', async () => {
    await build();
    component.approve(absence({}));
    expect(approve).toHaveBeenCalledWith('ab-1');
    expect(all).toHaveBeenCalledTimes(2);
  });

  describe('the 409', () => {
    it('is rendered as a worklist naming the rounds in the way', async () => {
      approve = jest.fn(() =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'Cannot approve: still rostered on 2 day(s)', conflictingRosterIds: ['r-1', 'r-2'] },
            }),
        ),
      );
      await build();

      component.approve(absence({}));
      fixture.detectChanges();

      const conflict = element().querySelector('[data-cy="conflict-ab-1"]')!;
      expect(conflict).not.toBeNull();
      // The ids are the worklist — the administrator reassigns these and retries unchanged.
      expect(conflict.textContent).toContain('r-1');
      expect(conflict.textContent).toContain('r-2');
      expect(component.conflictFor('ab-1')!.conflictingRosterIds).toEqual(['r-1', 'r-2']);
    });

    it('leaves the absence pending', async () => {
      approve = jest.fn(() => throwError(() => new HttpErrorResponse({ status: 409, error: { conflictingRosterIds: ['r-1'] } })));
      await build();
      component.approve(absence({}));
      fixture.detectChanges();
      expect(component.visible()[0].status).toBe('REQUESTED');
    });

    it('is cleared once approval succeeds', async () => {
      approve = jest.fn(() => throwError(() => new HttpErrorResponse({ status: 409, error: { conflictingRosterIds: ['r-1'] } })));
      await build();
      component.approve(absence({}));
      expect(component.conflictFor('ab-1')).toBeDefined();

      approve.mockReturnValue(of(absence({ status: 'APPROVED' })));
      component.approve(absence({}));
      fixture.detectChanges();
      expect(component.conflictFor('ab-1')).toBeUndefined();
    });

    it('does not turn an ordinary failure into a worklist', async () => {
      approve = jest.fn(() => throwError(() => new HttpErrorResponse({ status: 500 })));
      await build();
      component.approve(absence({}));
      fixture.detectChanges();
      expect(component.conflictFor('ab-1')).toBeUndefined();
      expect(element().querySelector('[data-cy="conflict-ab-1"]')).toBeNull();
    });
  });

  it('declines by deleting — there is no rejected state', async () => {
    // A rejected record that lingers on a calendar is a day nobody can read: is it off, or not?
    await build();
    component.decline(absence({}));
    expect(remove).toHaveBeenCalledWith('ab-1');
  });

  it('says so when there is nothing waiting', async () => {
    all = jest.fn(() => of([]));
    await build();
    expect(element().querySelector('[data-cy="queueEmpty"]')).not.toBeNull();
  });
});
