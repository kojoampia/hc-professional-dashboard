import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';
import { AlertService } from 'app/core/util/alert.service';

import { AbsenceApiService } from '../api/absence-api.service';
import { DutyRosterAssignmentsService } from '../api/duty-roster-assignments.service';
import DutyRosterPageComponent from './duty-roster-page.component';

/**
 * WP6's assignment-only gate, and the one exception DR8 gives it.
 *
 * <p>The page is a composition now rather than a screen, so what it owns is **which surfaces each
 * role sees**. The behaviour of each surface is covered where it lives — `roster/*.spec.ts`.
 *
 * <p>The gate itself is unchanged in substance: a professional reads their roster and cannot assign,
 * unassign or reassign anything, and there is no subscribe affordance anywhere. What DR8 adds is that
 * they may **ask for time off** and withdraw a request that has not been granted — a deliberate,
 * scoped exception, and the only write a professional has.
 */
describe('DutyRosterPageComponent (WP6 assignment-only, DR8 exception)', () => {
  let fixture: ComponentFixture<DutyRosterPageComponent>;

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

  const configure = async (authorities: string[]): Promise<void> => {
    authenticationState.next({ ...authenticationState.value, authorities });
    await TestBed.configureTestingModule({
      imports: [DutyRosterPageComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DutyRosterAssignmentsService,
          useValue: { range: jest.fn(() => of([])), summary: jest.fn(() => of([])), listAll: jest.fn(() => of([])) },
        },
        {
          provide: AbsenceApiService,
          useValue: {
            mine: jest.fn(() => of([])),
            own: jest.fn(() => of([])),
            all: jest.fn(() => of([])),
            forProfessional: jest.fn(() => of([])),
          },
        },
        { provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } },
        { provide: AlertService, useValue: { showToast: jest.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DutyRosterPageComponent);
    fixture.detectChanges();
  };

  const element = (): HTMLElement => fixture.nativeElement;

  it('gives a professional the calendar and their own time off, and no admin surface', async () => {
    await configure(['ROLE_NURSE']);

    expect(element().querySelector('hpd-roster-calendar')).not.toBeNull();
    // The DR8 exception: a professional may ask for time off. That is the only write here.
    expect(element().querySelector('hpd-absence-panel')).not.toBeNull();
    expect(element().querySelector('hpd-absence-queue')).toBeNull();
    expect(element().querySelector('hpd-round-builder')).toBeNull();
    expect(element().textContent).not.toContain('subscribe');
  });

  it('gives a read-only clinical role the same surfaces', async () => {
    // Carers, care angels, chemists and technicians are read-only under CLINICAL_MUTATION and must
    // still be able to ask for a holiday — /api/absences/** is .authenticated() for exactly this.
    await configure(['ROLE_CARER']);

    expect(element().querySelector('hpd-absence-panel')).not.toBeNull();
    expect(element().querySelector('hpd-round-builder')).toBeNull();
  });

  it('adds the approval queue and the round builder for an administrator', async () => {
    await configure(['ROLE_ADMIN']);

    expect(element().querySelector('hpd-roster-calendar')).not.toBeNull();
    // An administrator is also a person with time off, so the panel stays.
    expect(element().querySelector('hpd-absence-panel')).not.toBeNull();
    expect(element().querySelector('hpd-absence-queue')).not.toBeNull();
    expect(element().querySelector('hpd-round-builder')).not.toBeNull();
  });

  it('tells a professional the roster is assigned for them', async () => {
    await configure(['ROLE_NURSE']);
    expect(element().textContent).toContain('healthConnect.roster.assignmentOnly');
  });
});
