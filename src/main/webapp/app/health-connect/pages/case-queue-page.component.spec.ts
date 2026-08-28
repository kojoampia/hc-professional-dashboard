import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';

import { FakeHealthConnectRepository } from '../testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import { HealthConnectDialogService } from '../../shared/health-connect/dialog/dialog.service';
import CaseQueuePageComponent from './case-queue-page.component';

describe('CaseQueuePageComponent', () => {
  let component: CaseQueuePageComponent;
  let fixture: ComponentFixture<CaseQueuePageComponent>;
  let queryParamMap: BehaviorSubject<ParamMap>;
  const authenticationState = new BehaviorSubject({
    activated: true,
    authorities: ['ROLE_DOCTOR'],
    email: 'doctor@example.test',
    firstName: null,
    langKey: 'en',
    lastName: null,
    login: 'doctor',
    imageUrl: null,
  });
  const router = { navigate: jest.fn(() => Promise.resolve(true)) };
  /** What the stubbed reason dialog answers. Null is the user backing out. */
  let reasonAnswer: string | null = 'Resolved at follow-up';
  const dialogs = { reason: () => ({ afterClosed: () => new BehaviorSubject(reasonAnswer).asObservable() }) };
  let archiveSpy: jest.SpyInstance;
  const route = {
    get snapshot(): { queryParamMap: ParamMap } {
      return { queryParamMap: queryParamMap.value };
    },
    queryParamMap: undefined as unknown,
  };

  beforeEach(async () => {
    reasonAnswer = 'Resolved at follow-up';
    queryParamMap = new BehaviorSubject(convertToParamMap({ status: 'urgent' }));
    route.queryParamMap = queryParamMap.asObservable();
    await TestBed.configureTestingModule({
      imports: [CaseQueuePageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
        { provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } },
        // Archiving now asks why, because the server requires a reason. The dialog is stubbed to
        // answer immediately so these assertions stay synchronous; the reason itself is asserted
        // below, since sending an empty one would be refused by the api.
        { provide: HealthConnectDialogService, useValue: dialogs },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CaseQueuePageComponent);
    component = fixture.componentInstance;
    TestBed.inject(FakeHealthConnectRepository).reset();
    archiveSpy = jest.spyOn(TestBed.inject(FakeHealthConnectRepository), 'archiveCase');
    fixture.detectChanges();
    router.navigate.mockClear();
  });

  it('keeps URL status selection, header tint, and row set synchronized through history changes', () => {
    expect(component.statusFilter()).toBe('urgent');
    expect(component.rows()).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.hpd-stat-card--selected').textContent).toContain('urgent');

    queryParamMap.next(convertToParamMap({ status: 'closed', scope: 'mine' }));
    fixture.detectChanges();
    expect(component.statusFilter()).toBe('closed');
    expect(component.rosterScope()).toBe('mine');
    expect(component.rows()).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('thead').classList).toContain('hpd-data-table__header--closed');

    queryParamMap.next(convertToParamMap({ status: 'urgent' }));
    fixture.detectChanges();
    expect(component.statusFilter()).toBe('urgent');
    expect(component.rosterScope()).toBe('all');
    expect(component.rows()).toEqual(expect.arrayContaining([expect.objectContaining({ status: 'urgent' })]));
  });

  it('writes status and roster scope to the URL and opens standalone case detail', () => {
    component.setScope('mine');
    queryParamMap.next(convertToParamMap({ status: 'urgent', scope: 'mine' }));
    fixture.detectChanges();
    component.setStatus('open');
    component.handleAction({ actionId: 'view', row: component.rows()[0] });

    expect(router.navigate).toHaveBeenNthCalledWith(1, [], {
      relativeTo: route,
      queryParams: { status: 'urgent', scope: 'mine' },
    });
    expect(router.navigate).toHaveBeenNthCalledWith(2, [], {
      relativeTo: route,
      queryParams: { status: 'open', scope: 'mine' },
    });
    // preserve: the queue keeps rendering beneath the overlay, so opening a case must not drop
    // the status/scope filters and silently re-list every case.
    expect(router.navigate).toHaveBeenNthCalledWith(3, ['/cases', 'case-kojo-urgent'], { queryParamsHandling: 'preserve' });
  });

  it('reopens or archives closed cases only when the approved case permission is present', () => {
    queryParamMap.next(convertToParamMap({ status: 'closed' }));
    fixture.detectChanges();
    const closedCase = component.rows()[0];

    component.handleAction({ actionId: 'reopen', row: closedCase });
    expect(TestBed.inject(FakeHealthConnectRepository).findCase(closedCase.id)?.status).toBe('open');
    expect(component.rows()).toHaveLength(2);

    TestBed.inject(FakeHealthConnectRepository).reset();
    const archivedCase = component.rows()[0];
    component.handleAction({ actionId: 'archive', row: archivedCase });
    expect(component.rows()).toHaveLength(2);
    // The reason reaches the repository rather than being defaulted away.
    expect(archiveSpy).toHaveBeenCalledWith(archivedCase.id, 'Resolved at follow-up');

    // Backing out of the dialog archives nothing. Null is "cancelled", which is not the same as
    // an empty reason — the dialog cannot return one.
    reasonAnswer = null;
    const keptCase = component.rows()[0];
    component.handleAction({ actionId: 'archive', row: keptCase });
    expect(component.rows()).toHaveLength(2);
    reasonAnswer = 'Resolved at follow-up';

    authenticationState.next({ ...authenticationState.value, authorities: ['ROLE_USER'] });
    const protectedCase = component.rows()[0];
    component.handleAction({ actionId: 'reopen', row: protectedCase });
    expect(TestBed.inject(FakeHealthConnectRepository).findCase(protectedCase.id)?.status).toBe('closed');
  });
});
