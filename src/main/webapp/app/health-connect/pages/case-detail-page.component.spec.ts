import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';

import { FakeHealthConnectRepository } from '../testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import CaseDetailPageComponent from './case-detail-page.component';

describe('CaseDetailPageComponent', () => {
  let component: CaseDetailPageComponent;
  let fixture: ComponentFixture<CaseDetailPageComponent>;
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseDetailPageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ caseId: 'case-kojo-urgent' }) } } },
        { provide: Router, useValue: router },
        { provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CaseDetailPageComponent);
    component = fixture.componentInstance;
    TestBed.inject(FakeHealthConnectRepository).reset();
    fixture.detectChanges();
    router.navigate.mockClear();
  });

  it('persists editable clinical fields only for an approved clinical role and returns to the patient record', () => {
    component.form.controls.symptoms.setValue('Updated symptom');
    component.form.controls.diagnosis.setValue('Updated diagnosis');
    component.form.controls.recommendationIds.setValue(['recommendation-hpv']);

    component.save();

    expect(TestBed.inject(FakeHealthConnectRepository).findCase('case-kojo-urgent')).toEqual(
      expect.objectContaining({
        symptoms: 'Updated symptom',
        diagnosis: 'Updated diagnosis',
        recommendationIds: ['recommendation-hpv'],
      }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/patients', 'patient-kojo']);
  });

  it('renders a read-only form and prevents role-bypassed save mutations', () => {
    authenticationState.next({ ...authenticationState.value, authorities: ['ROLE_USER'] });
    fixture.detectChanges();
    component.form.controls.diagnosis.setValue('Attempted update');

    component.save();

    expect(component.canManageCases()).toBe(false);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(TestBed.inject(FakeHealthConnectRepository).findCase('case-kojo-urgent')?.diagnosis).not.toBe('Attempted update');
  });

  it('uses browser printing and preserves the print-friendly action hook', () => {
    const print = jest.spyOn(window, 'print').mockImplementation(() => undefined);

    component.print();

    expect(print).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.hpd-no-print')).not.toBeNull();
  });
  /**
   * The cold load: a deep link, a refresh or a bookmark, where the case is NOT in the cache when
   * the component is created. Every other test here starts warm, which is why this shipped —
   * clicking a row in the queue always finds the case already loaded, and the bug only appears
   * when the record is opened directly.
   */
  it('fills the form when the case arrives after the component was created', () => {
    const loadedCase = signal<
      { id: string; patientId: string; symptoms: string; diagnosis: string; recommendationIds: string[] } | undefined
    >(undefined);
    const repository = {
      findCase: () => loadedCase(),
      findPatient: () => undefined,
      recommendations: () => [],
      updateCase: jest.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CaseDetailPageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: HEALTH_CONNECT_REPOSITORY, useValue: repository },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ caseId: 'case-late' }) } } },
        { provide: Router, useValue: router },
        { provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } },
      ],
    });
    const late: ComponentFixture<CaseDetailPageComponent> = TestBed.createComponent(CaseDetailPageComponent);
    late.detectChanges();

    // Nothing loaded yet: the form is empty, and before the fix it stayed that way for good.
    expect(late.componentInstance.form.getRawValue().symptoms).toBe('');

    loadedCase.set({
      id: 'case-late',
      patientId: 'patient-kojo',
      symptoms: 'Fasting readings creeping upward',
      diagnosis: 'Deteriorating glycaemic control',
      recommendationIds: ['recommendation-hba1c'],
    });
    late.detectChanges();

    expect(late.componentInstance.form.getRawValue()).toEqual({
      symptoms: 'Fasting readings creeping upward',
      diagnosis: 'Deteriorating glycaemic control',
      recommendationIds: ['recommendation-hba1c'],
    });
  });

  it('does not overwrite what the clinician has already typed when the case lands late', () => {
    const loadedCase = signal<
      { id: string; patientId: string; symptoms: string; diagnosis: string; recommendationIds: string[] } | undefined
    >(undefined);
    const repository = {
      findCase: () => loadedCase(),
      findPatient: () => undefined,
      recommendations: () => [],
      updateCase: jest.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CaseDetailPageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: HEALTH_CONNECT_REPOSITORY, useValue: repository },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ caseId: 'case-late' }) } } },
        { provide: Router, useValue: router },
        { provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } },
      ],
    });
    const late: ComponentFixture<CaseDetailPageComponent> = TestBed.createComponent(CaseDetailPageComponent);
    late.detectChanges();

    late.componentInstance.form.controls.symptoms.setValue('Typed before the response landed');
    late.componentInstance.form.controls.symptoms.markAsDirty();
    loadedCase.set({ id: 'case-late', patientId: 'patient-kojo', symptoms: 'From the server', diagnosis: 'd', recommendationIds: [] });
    late.detectChanges();

    expect(late.componentInstance.form.getRawValue().symptoms).toBe('Typed before the response landed');
  });
});
