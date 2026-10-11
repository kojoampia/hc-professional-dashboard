import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { LANGUAGES } from 'app/config/language.constants';
import { Account } from 'app/core/auth/account.model';
import { OnboardingProgressDto, OnboardingSteps } from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { WIZARD_PANES, WizardPane, WizardService, wizardPanePath } from 'app/onboarding/wizard.service';

import WizardFooterComponent from './wizard-footer.component';

const ALL_TRUE: OnboardingSteps = { account: true, profile: true, documents: true, consent: true };
const ALL_FALSE: OnboardingSteps = { account: false, profile: false, documents: false, consent: false };

const progress = (steps: OnboardingSteps): OnboardingProgressDto => ({
  percent: 0,
  complete: false,
  status: 'APPLICATION_STARTED',
  requirements: [],
  steps,
});

const completeAccount = (): Account =>
  new Account(
    true,
    ['ROLE_USER'],
    'ama@example.com',
    'Ama',
    'en',
    'Mensah',
    'ama',
    'services/professionalservice/api/personal-document/d/content',
  );

describe('Wizard Footer Component', () => {
  let fixture: ComponentFixture<WizardFooterComponent>;
  let comp: WizardFooterComponent;
  let wizard: WizardService;
  let router: Router;
  let state: OnboardingProgressDto | null;

  const render = async (pane: WizardPane, steps: OnboardingSteps = ALL_TRUE): Promise<void> => {
    state = progress(steps);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [WizardFooterComponent, TranslateModule.forRoot()],
      providers: [
        { provide: OnboardingProgressService, useValue: { load: jest.fn(), refresh: jest.fn(), progress: () => state } },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      JSON.parse(readFileSync(resolve(__dirname, '../../../../i18n/en/healthConnect.json'), 'utf8')) as Record<string, unknown>,
    );
    translate.use('en');

    wizard = TestBed.inject(WizardService);
    wizard.setAccount(completeAccount());
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(WizardFooterComponent);
    comp = fixture.componentInstance;
    fixture.componentRef.setInput('pane', pane);
    fixture.detectChanges();
  };

  const hook = (name: string): HTMLButtonElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`[data-cy="${name}"]`);

  /** `profile.md:275-277` — *"the first pane has no back button"*. */
  it('should render no back button on the first pane', async () => {
    await render(WIZARD_PANES[0]);

    expect(hook('wizardBack')).toBeNull();
    expect(hook('wizardSave')).not.toBeNull();
    expect(hook('wizardNext')).not.toBeNull();
    expect(hook('wizardSubmit')).toBeNull();
  });

  /** *"…and the last has no next button but a submit button"*. */
  it('should render submit rather than next on the last pane', async () => {
    await render(WIZARD_PANES[WIZARD_PANES.length - 1]);

    expect(hook('wizardNext')).toBeNull();
    expect(hook('wizardSubmit')).not.toBeNull();
    expect(hook('wizardBack')).not.toBeNull();
  });

  it('should render all three on a middle pane', async () => {
    await render('profile');

    expect(hook('wizardBack')).not.toBeNull();
    expect(hook('wizardSave')).not.toBeNull();
    expect(hook('wizardNext')).not.toBeNull();
  });

  it('should count the step out of the total', async () => {
    await render('documents');

    expect(comp.stepNumber()).toBe(3);
    expect(comp.total).toBe(WIZARD_PANES.length);
    expect(hook('wizardStepCounter')!.textContent).toContain('3');
    expect(hook('wizardStepCounter')!.textContent).toContain('4');
  });

  /**
   * ⚠ **Disabled, not hidden, and said in words.** `profile.md:166` — each step opens only after the
   * previous one saved — so Next on an unsaved pane would lead somewhere the applicant cannot be. A
   * hidden button reads as "there is nothing further"; a disabled one with a reason reads as "not
   * yet".
   */
  it('should disable next while the following pane may not open, and say why', async () => {
    // Pane 2, not pane 1: pane 2's only predecessor is step 1, which is read from the ACCOUNT and is
    // complete in this fixture — so Next on pane 1 is correctly enabled whatever the meter says.
    // Pane 3 is the first that depends on a meter answer, which is the behaviour row 233 requires.
    await render('profile', ALL_FALSE);

    expect(comp.nextOpenable()).toBe(false);
    expect(hook('wizardNext')!.disabled).toBe(true);
    expect(hook('wizardNextLocked')).not.toBeNull();
    expect(hook('wizardNextLocked')!.getAttribute('role')).toBe('status');
  });

  it('should enable next once the following pane may open', async () => {
    await render('profile', ALL_TRUE);

    expect(comp.nextOpenable()).toBe(true);
    expect(hook('wizardNext')!.disabled).toBe(false);
    expect(hook('wizardNextLocked')).toBeNull();
  });

  /** ⛔ This component navigates and `WizardService` does not — the division § 3 T8 requires. */
  it('should navigate to the pane address, built from the one place it is spelled', async () => {
    await render('profile');
    const navigate = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    hook('wizardNext')!.click();

    expect(navigate).toHaveBeenCalledWith(wizardPanePath('documents'));

    hook('wizardBack')!.click();
    expect(navigate).toHaveBeenCalledWith(wizardPanePath('account'));
  });

  it('should raise save and submit rather than performing them', async () => {
    await render(WIZARD_PANES[WIZARD_PANES.length - 1]);
    const saved = jest.fn();
    const submitted = jest.fn();
    comp.save.subscribe(saved);
    comp.submitted.subscribe(submitted);

    hook('wizardSave')!.click();
    hook('wizardSubmit')!.click();

    expect(saved).toHaveBeenCalled();
    expect(submitted).toHaveBeenCalled();
  });

  it('should disable everything while a request is in flight', async () => {
    await render('profile');

    // setInput rather than assigning the field: the component is OnPush, so a plain assignment does
    // not mark the view dirty and detectChanges would re-render nothing.
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();

    expect(hook('wizardSave')!.disabled).toBe(true);
    expect(hook('wizardBack')!.disabled).toBe(true);
    expect(hook('wizardNext')!.disabled).toBe(true);
  });

  /** Submit's own reason, which is the pane's and not a sequencing question. */
  it('should disable submit when the pane says its form is not answerable', async () => {
    await render(WIZARD_PANES[WIZARD_PANES.length - 1]);

    fixture.componentRef.setInput('submitDisabled', true);
    fixture.detectChanges();

    expect(hook('wizardSubmit')!.disabled).toBe(true);
  });

  it.each(LANGUAGES)('should render the footer in %s with no raw translation keys', async locale => {
    await render('profile');
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      locale,
      JSON.parse(readFileSync(resolve(__dirname, `../../../../i18n/${locale}/healthConnect.json`), 'utf8')) as Record<string, unknown>,
    );
    translate.use(locale);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('healthConnect.actions');
    expect(text).not.toContain('healthConnect.onboarding');
  });
});
