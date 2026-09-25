import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';

import { FakeHealthConnectRepository } from '../testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import { asyncState } from '../health-connect.models';
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
      caseQueueState: signal(asyncState('loading')),
      // item 203: the page reads per-case state now, not the collection's. `loading` here is the
      // point of these two cases — the case lands AFTER the component was created.
      caseReadState: () => asyncState('loading'),
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
      caseQueueState: signal(asyncState('loading')),
      // item 203: the page reads per-case state now, not the collection's. `loading` here is the
      // point of these two cases — the case lands AFTER the component was created.
      caseReadState: () => asyncState('loading'),
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

  describe('why there is no case (backlog item 202)', () => {
    // One `role="alert"` reading "Nothing to show." stood for four unrelated situations: the case
    // read still in flight, refused, failed, and a case that genuinely is not there. hc-patient
    // refuses a technician the clinical-case read on every load, so a whole discipline had a
    // permissions boundary explained to them as "there is nothing here".
    //
    // Keyed on `data-cy` rather than on the rendered sentence: `TranslateModule.forRoot()` here
    // carries no catalogue, so every treatment renders its own key and a treatment identifiable
    // only by its words could not be asserted at all.
    let absent: ComponentFixture<CaseDetailPageComponent>;
    let repository: FakeHealthConnectRepository;
    const sentence = (): string => absent.nativeElement.textContent?.trim() ?? '';
    const marker = (name: string): HTMLElement | null => absent.nativeElement.querySelector(`[data-cy="${name}"]`);

    beforeEach(() => {
      // An id the fake does not hold, which is the only way to reach the `@else` at all.
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CaseDetailPageComponent, TranslateModule.forRoot()],
        providers: [
          { provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ caseId: 'case-absent' }) } } },
          { provide: Router, useValue: router },
          { provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } },
        ],
      });
      repository = TestBed.inject(FakeHealthConnectRepository);
      repository.reset();
      absent = TestBed.createComponent(CaseDetailPageComponent);
      absent.detectChanges();
    });

    it('says the read was REFUSED, and offers no retry that could only be refused again', () => {
      repository.setCaseReadState('case-absent', asyncState('forbidden', 'healthConnect.case.states.forbidden'));
      absent.detectChanges();

      expect(marker('caseForbidden')).not.toBeNull();
      expect(sentence()).toContain('healthConnect.case.states.forbidden');
      expect(sentence()).not.toContain('healthConnect.case.states.empty');
      // The half a loading guard alone would not buy, and the half that must not regress: a 403 is
      // refused every time, so nothing here may invite the clinician to re-issue it.
      expect(absent.nativeElement.querySelector('button')).toBeNull();
    });

    it('says the read FAILED when it failed, which is a different sentence again', () => {
      repository.setCaseReadState('case-absent', asyncState('error', 'healthConnect.case.states.error'));
      absent.detectChanges();

      expect(marker('caseFailed')).not.toBeNull();
      expect(sentence()).toContain('healthConnect.case.states.error');
      expect(marker('caseForbidden')).toBeNull();
      expect(marker('caseEmpty')).toBeNull();
    });

    it('says the read is still in FLIGHT rather than that the case is missing', () => {
      // The cold load — a deep link, a refresh, a bookmark — which is exactly when this screen used
      // to assert absence about a response that had not arrived.
      repository.setCaseReadState('case-absent', asyncState('loading'));
      absent.detectChanges();

      expect(marker('caseLoading')).not.toBeNull();
      expect(sentence()).toContain('healthConnect.case.states.loading');
      expect(marker('caseEmpty')).toBeNull();
    });

    it('still says the case was not found for a read that succeeded and found none', () => {
      // The positive control, and why absence stays the default: it is the right sentence for an
      // archived case or a stale bookmark, and the wrong one for every other reason there is none.
      repository.setCaseReadState('case-absent', asyncState('ready'));
      absent.detectChanges();

      expect(marker('caseEmpty')).not.toBeNull();
      expect(sentence()).toContain('healthConnect.case.states.empty');
      expect(marker('caseForbidden')).toBeNull();
      expect(marker('caseFailed')).toBeNull();
      expect(marker('caseLoading')).toBeNull();
    });

    // Item 204, and the same two assertions as patient-record-page.component.spec.ts, because these
    // two screens are deliberately one shape and a guard on one of them is not a guard on the pair.
    //
    // Each treatment above is its own live region and each was INSERTED WITH ITS TEXT by the arm
    // that rendered it; a polite region generally has to exist before its content changes to be
    // announced. So the refusal — the treatment a technician meets on every load — was the one
    // least likely to be heard, while the two reporting a failure announced on insertion because
    // role="alert" is assertive.
    //
    // WHAT THIS CAN AND CANNOT ASSERT. There is no screen reader here, so nothing below observes an
    // announcement; what it observes is the structural precondition for one. The identity check is
    // `toBe` on the element reference, because a region re-created with its new content is exactly
    // the defect and would satisfy `not.toBeNull()` on both sides of the transition.
    describe('and the refusal has a live region to be announced in (item 204)', () => {
      const region = (): HTMLElement | null => absent.nativeElement.querySelector('[data-cy="caseStateRegion"]');

      it('keeps one live region across the in-flight → refused transition, rather than replacing it', () => {
        repository.setCaseReadState('case-absent', asyncState('loading'));
        absent.detectChanges();
        const before = region();

        expect(before).not.toBeNull();
        expect(before!.getAttribute('aria-live')).toBe('polite');
        // Item 206, and the same line as patient-record-page.component.spec.ts for the same reason
        // this block is the same one: aria-atomic is the other half of the pair and was the unheld
        // half. The transition below is a removal plus an insertion, so without it a reader is free
        // to announce only the node that changed rather than the whole replacement sentence.
        expect(before!.getAttribute('aria-atomic')).toBe('true');
        expect(before!.querySelector('[data-cy="caseLoading"]')).not.toBeNull();

        repository.setCaseReadState('case-absent', asyncState('forbidden', 'healthConnect.case.states.forbidden'));
        absent.detectChanges();

        expect(region()).toBe(before);
        expect(before!.querySelector('[data-cy="caseForbidden"]')).not.toBeNull();
      });

      it('leaves item 146’s status/alert split alone — the wrapper is the fix, the roles are not', () => {
        repository.setCaseReadState('case-absent', asyncState('forbidden', 'healthConnect.case.states.forbidden'));
        absent.detectChanges();

        expect(marker('caseForbidden')!.getAttribute('role')).toBe('status');

        repository.setCaseReadState('case-absent', asyncState('error', 'healthConnect.case.states.error'));
        absent.detectChanges();

        expect(marker('caseFailed')!.getAttribute('role')).toBe('alert');

        repository.setCaseReadState('case-absent', asyncState('loading'));
        absent.detectChanges();

        expect(marker('caseLoading')!.getAttribute('role')).toBe('status');
      });
    });
  });
});
