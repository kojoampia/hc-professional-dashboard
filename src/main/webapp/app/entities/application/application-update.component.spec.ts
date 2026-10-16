import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { of, throwError } from 'rxjs';

import { CAREER_AUTHORITIES } from 'app/config/authority.constants';
import { LANGUAGES } from 'app/config/language.constants';
import { CareersHandoffService } from 'app/core/careers/careers-handoff.service';
import { AlertService } from 'app/core/util/alert.service';
import { OnboardingApplicationDto, OnboardingStatus } from 'app/health-connect/api/onboarding-api.service';
import { ApplicationService } from './service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';

import ApplicationUpdateComponent from './application-update.component';
import { APPLICANT_HELD_STATUSES, applicantHolds } from './model';

const application = (overrides: Partial<OnboardingApplicationDto> = {}): OnboardingApplicationDto => ({
  id: 'a-1',
  accountId: 'acct-1',
  authority: 'ROLE_NURSE',
  status: 'PROFILE_COMPLETED',
  agreed: true,
  ...overrides,
});

describe('Application Update Component — step 4', () => {
  let comp: ApplicationUpdateComponent;
  let fixture: ComponentFixture<ApplicationUpdateComponent>;
  let api: {
    find: jest.Mock;
    start: jest.Mock;
    saveConsent: jest.Mock;
    submit: jest.Mock;
    completeProfile: jest.Mock;
  };
  let careers: { peek: jest.Mock; clear: jest.Mock };
  let progressService: { load: jest.Mock; refresh: jest.Mock; progress: jest.Mock; complete: jest.Mock };
  let alertService: { showToast: jest.Mock };

  const build = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ApplicationUpdateComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ApplicationService, useValue: api },
        { provide: CareersHandoffService, useValue: careers },
        { provide: OnboardingProgressService, useValue: progressService },
        { provide: AlertService, useValue: alertService },
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
      .overrideTemplate(ApplicationUpdateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(ApplicationUpdateComponent);
    comp = fixture.componentInstance;
  };

  beforeEach(async () => {
    api = {
      find: jest.fn().mockReturnValue(of(application())),
      start: jest.fn().mockImplementation(authority => of(application({ authority }))),
      saveConsent: jest.fn().mockImplementation(authority => of(application({ authority }))),
      submit: jest.fn().mockImplementation(authority => of(application({ authority, status: 'CREDENTIAL_REVIEW' }))),
      completeProfile: jest.fn().mockReturnValue(of(application())),
    };
    careers = { peek: jest.fn().mockReturnValue(null), clear: jest.fn() };
    progressService = {
      load: jest.fn(),
      refresh: jest.fn(),
      progress: jest.fn().mockReturnValue(null),
      complete: jest.fn().mockReturnValue(true),
    };
    alertService = { showToast: jest.fn() };
    await build();
  });

  it('should fill the form from the stored application', () => {
    comp.ngOnInit();

    expect(comp.loadState()).toBe('ready');
    expect(comp.form.getRawValue()).toEqual({ authority: 'ROLE_NURSE', agreed: true });
  });

  /** 404 is "not applied yet" — the normal state for every clinician an administrator invited. */
  it('should show an empty consent form when there is no application yet', () => {
    api.find.mockReturnValue(throwError(() => ({ status: 404 })));

    comp.ngOnInit();

    expect(comp.loadState()).toBe('ready');
    expect(comp.application()).toBeNull();
    expect(comp.form.getRawValue()).toEqual({ authority: '', agreed: false });
  });

  it('should report a genuine read failure', () => {
    api.find.mockReturnValue(throwError(() => ({ status: 500 })));

    comp.ngOnInit();

    expect(comp.loadState()).toBe('error');
  });

  describe('the careers handoff', () => {
    /** `careers-handoff-contract.md`: `/register?track=<AuthorityRole>` pre-selects the role. */
    it('should pre-select the role from the careers track when there is no application yet', () => {
      careers.peek.mockReturnValue({ track: 'ROLE_PARAMEDIC', locale: 'en', src: 'web-careers', at: '' });
      api.find.mockReturnValue(throwError(() => ({ status: 404 })));

      comp.ngOnInit();

      expect(comp.form.controls.authority.value).toBe('ROLE_PARAMEDIC');
      expect(comp.prefilledFromCareers()).toBe(true);
    });

    /**
     * ⛔ **Graceful degradation, which the contract depends on.** No parameters at all — a
     * cross-device activation, or a direct sign-in — leaves the dropdown empty and required, with no
     * silent default: *"a visiting physician who does not notice a pre-selected nurse is filed as
     * one."*
     */
    it('should work with no careers parameters at all, choosing nothing', () => {
      careers.peek.mockReturnValue(null);
      api.find.mockReturnValue(throwError(() => ({ status: 404 })));

      comp.ngOnInit();

      expect(comp.loadState()).toBe('ready');
      expect(comp.form.controls.authority.value).toBe('');
      expect(comp.form.controls.authority.invalid).toBe(true);
      expect(comp.prefilledFromCareers()).toBe(false);
    });

    /** The stored answer wins: overwriting it from a stale localStorage value would change the
     * applicant's declared discipline behind them. */
    it('should let a stored authority win over the careers track', () => {
      careers.peek.mockReturnValue({ track: 'ROLE_PARAMEDIC', locale: null, src: null, at: '' });

      comp.ngOnInit();

      expect(comp.form.controls.authority.value).toBe('ROLE_NURSE');
      expect(comp.prefilledFromCareers()).toBe(false);
    });

    /** `src` is the attribution the review queue reads and the WP7 funnel counts — creation only. */
    it('should send the careers src when it creates the application', () => {
      careers.peek.mockReturnValue({ track: 'ROLE_CARER', locale: null, src: 'web-careers', at: '' });
      api.find.mockReturnValue(throwError(() => ({ status: 404 })));
      comp.ngOnInit();
      comp.form.patchValue({ agreed: true });

      comp.save();

      expect(api.start).toHaveBeenCalledWith('ROLE_CARER', 'web-careers');
      expect(careers.clear).toHaveBeenCalled();
    });
  });

  /**
   * ⭐ The derived list: `CAREER_AUTHORITIES` is a filter of `Authority`, so `ROLE_ADMIN` and
   * `ROLE_USER` — the two the server refuses with a 400 — cannot be offered. ⛔ A hand-written copy
   * would have been the eighth of a documented cross-repo invariant.
   */
  it('should offer the eight career disciplines and neither ROLE_ADMIN nor ROLE_USER', () => {
    expect(comp.roles).toEqual(CAREER_AUTHORITIES);
    expect(comp.roles).toHaveLength(8);
    expect(comp.roles as readonly string[]).not.toContain('ROLE_ADMIN');
    expect(comp.roles as readonly string[]).not.toContain('ROLE_USER');
  });

  describe('Save', () => {
    it('should start the application with a POST when there is none', () => {
      api.find.mockReturnValue(throwError(() => ({ status: 404 })));
      comp.ngOnInit();
      comp.form.patchValue({ authority: 'ROLE_NURSE', agreed: true });

      comp.save();

      expect(api.start).toHaveBeenCalled();
      expect(api.saveConsent).not.toHaveBeenCalled();
    });

    /** A second POST is a 409 *"An application already exists for this account"*. */
    it('should update an existing application with a PUT rather than a second POST', () => {
      comp.ngOnInit();

      comp.save();

      expect(api.saveConsent).toHaveBeenCalledWith('ROLE_NURSE');
      expect(api.start).not.toHaveBeenCalled();
    });

    it('should refuse to save without consent, and send nothing', () => {
      api.find.mockReturnValue(throwError(() => ({ status: 404 })));
      comp.ngOnInit();
      comp.form.patchValue({ authority: 'ROLE_NURSE', agreed: false });

      comp.save();

      expect(api.start).not.toHaveBeenCalled();
      expect(comp.form.controls.agreed.touched).toBe(true);
    });

    it('should refuse to save without a role, and send nothing', () => {
      api.find.mockReturnValue(throwError(() => ({ status: 404 })));
      comp.ngOnInit();
      comp.form.patchValue({ authority: '', agreed: true });

      comp.save();

      expect(api.start).not.toHaveBeenCalled();
    });
  });

  describe('Submit', () => {
    /**
     * ⚠ `completeProfile` first: the state machine requires `PROFILE_COMPLETED` before
     * `CREDENTIAL_REVIEW`, and submitting straight from `APPLICATION_STARTED` is a 409. The order is
     * asserted, not just the two calls.
     */
    it('should complete the profile before submitting, in that order', () => {
      comp.ngOnInit();

      comp.submit();

      expect(api.completeProfile).toHaveBeenCalled();
      expect(api.submit).toHaveBeenCalledWith('ROLE_NURSE');
      expect(api.completeProfile.mock.invocationCallOrder[0]).toBeLessThan(api.submit.mock.invocationCallOrder[0]);
      expect(alertService.showToast).toHaveBeenCalledWith('healthConnect.onboarding.toast.submitted');
    });

    /** An application already past that step answers an error that is a legal state, not a failure. */
    it('should submit anyway when completing the profile is refused as already done', () => {
      api.completeProfile.mockReturnValue(throwError(() => ({ status: 409 })));
      comp.ngOnInit();

      comp.submit();

      expect(api.submit).toHaveBeenCalled();
    });

    /** `profile.md:263` — Submit sets `CREDENTIAL_REVIEW`, through `transition()` server-side. */
    it('should leave the application in CREDENTIAL_REVIEW after a submit', () => {
      comp.ngOnInit();

      comp.submit();

      expect(comp.application()?.status).toBe('CREDENTIAL_REVIEW');
    });

    /**
     * ⛔ **Submit is offered only when the server says every requirement is met.** It would otherwise
     * 400 on the mandatory-document guard, which reads as a broken page rather than as "you have not
     * finished".
     */
    it('should not offer Submit while the server says the application is incomplete', () => {
      progressService.complete.mockReturnValue(false);
      comp.ngOnInit();

      expect(comp.canSubmit()).toBe(false);
      expect(comp.submitBlockedReason()).toBe('incomplete');
    });

    /** Null, not false: a figure that has not arrived must not read as "finished". */
    it('should not offer Submit while the meter has not answered', () => {
      progressService.complete.mockReturnValue(null);
      comp.ngOnInit();

      expect(comp.canSubmit()).toBe(false);
    });

    /**
     * ⚠ A second Submit is a **409** — saying "I am finished" twice is a conflict in a way that
     * saving twice is not — so the button is withdrawn once the application has left the applicant's
     * hands. ⛔ The **pane** stays editable all the same; that is the wizard's post-submit rule and a
     * different question.
     */
    it('should withdraw Submit once the application has been submitted, and say why', () => {
      api.find.mockReturnValue(of(application({ status: 'CREDENTIAL_REVIEW' })));
      comp.ngOnInit();

      expect(comp.canSubmit()).toBe(false);
      expect(comp.submitBlockedReason()).toBe('alreadySubmitted');
    });

    it('should send nothing when Submit is pressed on an incomplete application', () => {
      progressService.complete.mockReturnValue(false);
      comp.ngOnInit();

      comp.submit();

      expect(api.completeProfile).not.toHaveBeenCalled();
      expect(api.submit).not.toHaveBeenCalled();
    });

    /** A returned application is the applicant's again, and `correctionNotes` is what they must read. */
    it('should offer Submit again on a returned application, and show the reviewer note', () => {
      api.find.mockReturnValue(of(application({ status: 'RETURNED_FOR_CORRECTION', correctionNotes: 'Licence expired' })));
      comp.ngOnInit();

      expect(comp.canSubmit()).toBe(true);
      expect(comp.correctionNotes()).toBe('Licence expired');
    });

    it('should show no correction note on an application that was not returned', () => {
      api.find.mockReturnValue(of(application({ correctionNotes: 'stale note' })));
      comp.ngOnInit();

      expect(comp.correctionNotes()).toBeNull();
    });
  });
});

describe('applicantHolds', () => {
  it('should name the three statuses in which Submit is the applicant next move', () => {
    expect(APPLICANT_HELD_STATUSES).toEqual(['APPLICATION_STARTED', 'PROFILE_COMPLETED', 'RETURNED_FOR_CORRECTION']);
  });

  it.each<OnboardingStatus>(['APPLICATION_STARTED', 'PROFILE_COMPLETED', 'RETURNED_FOR_CORRECTION'])('should hold %s', status => {
    expect(applicantHolds(status)).toBe(true);
  });

  it.each<OnboardingStatus>(['CREDENTIAL_REVIEW', 'APPROVED', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'DEACTIVATED'])(
    'should not hold %s',
    status => {
      expect(applicantHolds(status)).toBe(false);
    },
  );

  it('should not hold a missing status', () => {
    expect(applicantHolds(null)).toBe(false);
    expect(applicantHolds(undefined)).toBe(false);
  });
});

/** ⭐ Rendered against the real catalogues in all four languages — see the step-1 spec for why. */
describe('Application Update Component — rendered in four languages', () => {
  const catalogue = (locale: string): Record<string, unknown> =>
    JSON.parse(readFileSync(resolve(__dirname, `../../../i18n/${locale}/healthConnect.json`), 'utf8')) as Record<string, unknown>;

  const render = async (locale: string, dto = application()): Promise<ComponentFixture<ApplicationUpdateComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ApplicationUpdateComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ApplicationService,
          useValue: {
            find: () => of(dto),
            start: jest.fn(),
            saveConsent: jest.fn(),
            submit: jest.fn(),
            completeProfile: jest.fn(),
          },
        },
        { provide: CareersHandoffService, useValue: { peek: () => null, clear: jest.fn() } },
        {
          provide: OnboardingProgressService,
          useValue: { load: jest.fn(), refresh: jest.fn(), progress: () => null, complete: () => true },
        },
        { provide: AlertService, useValue: { showToast: jest.fn() } },
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(locale, catalogue(locale));
    translate.use(locale);

    const fixture = TestBed.createComponent(ApplicationUpdateComponent);
    fixture.detectChanges();
    return fixture;
  };

  it.each(LANGUAGES)('should render step 4 in %s with no raw translation keys', async locale => {
    const fixture = await render(locale);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    const onboarding = (
      catalogue(locale) as { healthConnect: { onboarding: { consentText: string; wizard: { application: Record<string, string> } } } }
    ).healthConnect.onboarding;
    expect(text).toContain(onboarding.wizard.application.title);
    expect(text).toContain(onboarding.consentText);
    expect(text).not.toContain('healthConnect.onboarding');
    expect(text).not.toContain('healthConnect.roles');
  });

  it('should render the eight disciplines as translated role names', async () => {
    const fixture = await render('en');
    const options = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLOptionElement>('[data-cy="applicationStepAuthority"] option'),
    );
    const roles = (catalogue('en') as { healthConnect: { roles: Record<string, string> } }).healthConnect.roles;

    // The placeholder plus the eight.
    expect(options).toHaveLength(9);
    expect(options.map(option => option.textContent!.trim())).toContain(roles.nurse);
    expect(options.map(option => option.value)).not.toContain('ROLE_ADMIN');
  });

  it('should render the reviewer correction note when the application was returned', async () => {
    const fixture = await render('en', application({ status: 'RETURNED_FOR_CORRECTION', correctionNotes: 'Licence expired' }));
    const notice = (fixture.nativeElement as HTMLElement).querySelector('[data-cy="applicationStepCorrection"]');

    expect(notice).not.toBeNull();
    expect(notice!.textContent).toContain('Licence expired');
    expect(notice!.getAttribute('role')).toBe('alert');
  });
});
