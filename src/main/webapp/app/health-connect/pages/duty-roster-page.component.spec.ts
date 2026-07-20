import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';

import { MockHealthConnectRepository } from '../health-connect.repository';
import DutyRosterPageComponent from './duty-roster-page.component';

describe('DutyRosterPageComponent', () => {
  let component: DutyRosterPageComponent;
  let fixture: ComponentFixture<DutyRosterPageComponent>;
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DutyRosterPageComponent, TranslateModule.forRoot()],
      providers: [{ provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } }],
    }).compileComponents();
    fixture = TestBed.createComponent(DutyRosterPageComponent);
    component = fixture.componentInstance;
    TestBed.inject(MockHealthConnectRepository).reset();
    fixture.detectChanges();
  });

  it('lists subscribed and available rosters with their shifts', () => {
    expect(component.subscribedRosters()).toEqual([expect.objectContaining({ id: 'ward-3-night' })]);
    expect(component.availableRosters()).toEqual([expect.objectContaining({ id: 'clinic-a-day' })]);
    expect(fixture.nativeElement.textContent).toContain('active');
    expect(fixture.nativeElement.textContent).toContain('upcoming');
    expect(fixture.nativeElement.textContent).toContain('completed');
  });

  it('persists subscription mutations in repository signals and immediately updates the header shift source', () => {
    const repository = TestBed.inject(MockHealthConnectRepository);
    const professionalId = component.professionalId()!;
    const wardRoster = component.subscribedRosters()[0];

    component.toggleSubscription(wardRoster, professionalId);
    fixture.detectChanges();
    expect(component.subscribedRosters()).toEqual([]);
    expect(component.availableRosters()).toEqual(expect.arrayContaining([expect.objectContaining({ id: wardRoster.id })]));
    expect(repository.shiftLabelForAccount('doctor')).toBeNull();
    expect(repository.listCases(undefined, 'mine', professionalId)).toEqual([]);

    component.toggleSubscription(repository.dutyRosters().find(roster => roster.id === wardRoster.id)!, professionalId);
    fixture.detectChanges();
    expect(component.subscribedRosters()).toEqual([expect.objectContaining({ id: wardRoster.id })]);
    expect(repository.listCases(undefined, 'mine', professionalId)).toHaveLength(7);
    expect(repository.shiftLabelForAccount('doctor')).toEqual({
      translationKey: 'healthConnect.roster.activeShift',
      translationParams: { time: '20:00' },
    });
  });

  it('does not mutate a roster subscription for a read-only role', () => {
    const repository = TestBed.inject(MockHealthConnectRepository);
    authenticationState.next({ ...authenticationState.value, authorities: ['ROLE_USER'] });
    fixture.detectChanges();

    component.toggleSubscription(component.subscribedRosters()[0], component.professionalId()!);

    expect(repository.dutyRosters().find(roster => roster.id === 'ward-3-night')?.subscribedProfessionalIds).toContain(
      'professional-doctor',
    );
  });
});
