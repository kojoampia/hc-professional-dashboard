import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';

import { MockHealthConnectRepository } from '../health-connect.repository';
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
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ caseId: 'case-kojo-urgent' }) } } },
        { provide: Router, useValue: router },
        { provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CaseDetailPageComponent);
    component = fixture.componentInstance;
    TestBed.inject(MockHealthConnectRepository).reset();
    fixture.detectChanges();
    router.navigate.mockClear();
  });

  it('persists editable clinical fields only for an approved clinical role and returns to the patient record', () => {
    component.form.controls.symptoms.setValue('Updated symptom');
    component.form.controls.diagnosis.setValue('Updated diagnosis');
    component.form.controls.recommendationIds.setValue(['recommendation-hpv']);

    component.save();

    expect(TestBed.inject(MockHealthConnectRepository).findCase('case-kojo-urgent')).toEqual(
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
    expect(TestBed.inject(MockHealthConnectRepository).findCase('case-kojo-urgent')?.diagnosis).not.toBe('Attempted update');
  });

  it('uses browser printing and preserves the print-friendly action hook', () => {
    const print = jest.spyOn(window, 'print').mockImplementation(() => undefined);

    component.print();

    expect(print).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.hpd-no-print')).not.toBeNull();
  });
});
