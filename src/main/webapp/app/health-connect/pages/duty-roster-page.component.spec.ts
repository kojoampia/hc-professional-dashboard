import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';
import { AlertService } from 'app/core/util/alert.service';

import { DutyRosterAssignmentDto, DutyRosterAssignmentsService } from '../api/duty-roster-assignments.service';
import DutyRosterPageComponent from './duty-roster-page.component';

/**
 * WP6 gate: the roster page is assignment-only — professionals get a
 * read-only view of their own assignments, only administrators assign and
 * unassign, and there is no subscribe affordance anywhere.
 */
describe('DutyRosterPageComponent (WP6 assignment-only)', () => {
  let component: DutyRosterPageComponent;
  let fixture: ComponentFixture<DutyRosterPageComponent>;
  let api: {
    myAssignments: ReturnType<typeof signal<readonly DutyRosterAssignmentDto[]>>;
    loadMyAssignments: jest.Mock;
    listAll: jest.Mock;
    assign: jest.Mock;
    unassign: jest.Mock;
  };
  const authenticationState = new BehaviorSubject({
    activated: true,
    authorities: ['ROLE_NURSE'],
    email: 'nurse@example.test',
    firstName: null,
    langKey: 'en',
    lastName: null,
    login: 'nurse',
    imageUrl: null,
  });

  const assignment: DutyRosterAssignmentDto = {
    id: 'a-1',
    date: '2026-07-30',
    duty: 'NURSE',
    professionalId: 'prof-1',
    shift: 'NIGHT',
    name: 'Ward 3 night',
  };

  const configure = async (): Promise<void> => {
    api = {
      myAssignments: signal<readonly DutyRosterAssignmentDto[]>([assignment]),
      loadMyAssignments: jest.fn(),
      listAll: jest.fn(() => of([assignment])),
      assign: jest.fn(() => of(assignment)),
      unassign: jest.fn(() => of(void 0)),
    };
    await TestBed.configureTestingModule({
      imports: [DutyRosterPageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DutyRosterAssignmentsService, useValue: api as unknown as DutyRosterAssignmentsService },
        { provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } },
        { provide: AlertService, useValue: { showToast: jest.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DutyRosterPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('shows a professional their own assignments read-only, with no admin or subscribe affordances', async () => {
    authenticationState.next({ ...authenticationState.value, authorities: ['ROLE_NURSE'] });
    await configure();

    expect(api.loadMyAssignments).toHaveBeenCalled();
    expect(api.listAll).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-cy="myAssignments"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-cy="rosterAdmin"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('subscribe');
  });

  it('lets an administrator assign a shift once the form is valid', async () => {
    authenticationState.next({ ...authenticationState.value, authorities: ['ROLE_ADMIN'] });
    await configure();

    expect(fixture.nativeElement.querySelector('[data-cy="rosterAdmin"]')).toBeTruthy();
    expect(api.listAll).toHaveBeenCalled();

    component.assign();
    expect(api.assign).not.toHaveBeenCalled(); // invalid form blocks submission

    component.assignForm.patchValue({ professionalId: 'prof-1', date: '2026-07-30', shift: 'NIGHT', duty: 'NURSE', name: 'Ward 3 night' });
    component.assign();
    expect(api.assign).toHaveBeenCalledWith(
      expect.objectContaining({ professionalId: 'prof-1', date: '2026-07-30', shift: 'NIGHT', duty: 'NURSE', name: 'Ward 3 night' }),
    );
    expect(TestBed.inject(AlertService).showToast).toHaveBeenCalledWith('healthConnect.toast.rosterUpdated');
  });

  it('lets an administrator unassign an existing assignment', async () => {
    authenticationState.next({ ...authenticationState.value, authorities: ['ROLE_ADMIN'] });
    await configure();

    component.unassign(assignment);
    expect(api.unassign).toHaveBeenCalledWith('a-1');
  });
});
