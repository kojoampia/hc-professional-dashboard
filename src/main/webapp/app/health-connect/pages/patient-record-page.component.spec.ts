import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';

import { MockHealthConnectRepository } from '../health-connect.repository';
import PatientRecordPageComponent from './patient-record-page.component';

describe('PatientRecordPageComponent', () => {
  let component: PatientRecordPageComponent;
  let fixture: ComponentFixture<PatientRecordPageComponent>;
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
      imports: [PatientRecordPageComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ patientId: 'patient-kojo' }) } } },
        },
        { provide: Router, useValue: { navigate: jest.fn(() => Promise.resolve(true)) } },
        { provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PatientRecordPageComponent);
    component = fixture.componentInstance;
    TestBed.inject(MockHealthConnectRepository).reset();
    fixture.detectChanges();
  });

  it('uses labelled clinical panels and a focusable activity dialog trigger', () => {
    const panelHeadings = fixture.nativeElement.querySelectorAll('.hpd-panel h2');
    const trigger = fixture.nativeElement.querySelector('[aria-haspopup="dialog"]') as HTMLButtonElement;

    expect(panelHeadings).toHaveLength(5);
    expect(trigger).not.toBeNull();
    expect(trigger.classList).toContain('hpd-focusable');
    expect(fixture.nativeElement.querySelector('.hpd-record-grid')).not.toBeNull();
  });

  it('blocks report mutations for a read-only role, including direct method invocation', () => {
    authenticationState.next({ ...authenticationState.value, authorities: ['ROLE_USER'] });
    fixture.detectChanges();

    component.upload([new File(['report'], 'report.pdf', { type: 'application/pdf' })]);

    expect(component.canManageReports()).toBe(false);
    expect(fixture.nativeElement.querySelector('hpd-file-upload-trigger button').disabled).toBe(true);
    expect(TestBed.inject(MockHealthConnectRepository).findPatient('patient-kojo')?.reports).toHaveLength(1);
  });
});
