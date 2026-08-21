import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AlertService } from 'app/core/util/alert.service';

import { AbsenceApiService, AbsenceDto } from '../api/absence-api.service';
import { AbsencePanelComponent } from './absence-panel.component';
import { todayIsoDate } from './calendar-date.util';

/**
 * A professional's own time off (docs/duty-roster.md § 8, DR8).
 *
 * <p>This is the **first and only write a professional has against their own roster**, so the cases
 * worth having are the ones that keep it scoped: that the request names neither whose absence it is
 * nor that it is approved, and that withdrawal is offered only while a request is still pending.
 */
describe('AbsencePanelComponent (DR8)', () => {
  let fixture: ComponentFixture<AbsencePanelComponent>;
  let component: AbsencePanelComponent;
  let own: jest.Mock;
  let request: jest.Mock;
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
      imports: [AbsencePanelComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AbsenceApiService, useValue: { own, request, remove } },
        { provide: AlertService, useValue: { showToast: jest.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AbsencePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const element = (): HTMLElement => fixture.nativeElement;

  beforeEach(() => {
    own = jest.fn(() => of([absence({})]));
    request = jest.fn(() => of(absence({ id: 'ab-2' })));
    remove = jest.fn(() => of(void 0));
  });

  it('lists the caller’s own absences', async () => {
    await build();
    expect(own).toHaveBeenCalled();
    expect(element().querySelector('[data-cy="absenceStatus-ab-1"]')).not.toBeNull();
  });

  it('sends only dates and a type — never a professional or a status', async () => {
    // The server ignores both from a non-administrator and forces them onto the caller, so sending
    // them would be inert. A client that appears to choose whose absence it is, or that it is already
    // approved, invites the next reader to believe it can.
    await build();
    component.form.setValue({ fromDate: '2026-09-14', toDate: '2026-09-18', type: 'SICK' });
    component.submit();

    expect(request).toHaveBeenCalledWith({ fromDate: '2026-09-14', toDate: '2026-09-18', type: 'SICK' });
    expect(Object.keys(request.mock.calls[0][0])).toEqual(['fromDate', 'toDate', 'type']);
  });

  it('does not submit an incomplete form', async () => {
    await build();
    component.submit();
    expect(request).not.toHaveBeenCalled();
  });

  it('offers no date earlier than today', async () => {
    // The server refuses a backdated start with a 400 regardless; this is courtesy, so a clinician is
    // not offered a day that will be rejected. Retrospective sickness is an administrator's to record.
    await build();
    const from = element().querySelector('[data-cy="absenceFrom"]') as HTMLInputElement;
    expect(from.min).toBe(todayIsoDate());
  });

  it('shows the server’s own message when a request is refused', async () => {
    // It distinguishes a backdated start from a reversed range from a missing type, and each has a
    // different fix — a generic "could not save" would throw that away.
    request = jest.fn(() => throwError(() => ({ error: 'An absence cannot start in the past.' })));
    await build();
    component.form.setValue({ fromDate: '2020-01-01', toDate: '2020-01-02', type: 'SICK' });
    component.submit();
    fixture.detectChanges();

    expect(element().querySelector('[data-cy="absenceError"]')!.textContent).toContain('cannot start in the past');
  });

  describe('withdrawal', () => {
    it('is offered while a request is pending', async () => {
      await build();
      expect(element().querySelector('[data-cy="absenceWithdraw-ab-1"]')).not.toBeNull();
    });

    it('is not offered once the absence is granted', async () => {
      // Cover may already have been arranged around it, so coming back is a conversation with the
      // roster administrator rather than a button — and the server refuses it too.
      own = jest.fn(() => of([absence({ status: 'APPROVED' })]));
      await build();
      expect(element().querySelector('[data-cy="absenceWithdraw-ab-1"]')).toBeNull();
    });

    it('deletes and reloads', async () => {
      await build();
      component.withdraw(absence({}));
      expect(remove).toHaveBeenCalledWith('ab-1');
      expect(own).toHaveBeenCalledTimes(2);
    });
  });

  it('renders a pending absence hatched and a granted one solid', async () => {
    // The same treatment the calendar gives them, so "asked for" and "granted" look the same in both
    // places. A person turning up, or not turning up, on the strength of a fill is the cost of
    // getting this wrong.
    await build();
    expect(component.statusClass(absence({ status: 'REQUESTED' }))).toContain('hpd-roster-pending');
    expect(component.statusClass(absence({ status: 'APPROVED' }))).not.toContain('hpd-roster-pending');
  });
});
