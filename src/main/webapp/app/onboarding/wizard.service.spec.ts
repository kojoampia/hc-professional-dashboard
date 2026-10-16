import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Account } from 'app/core/auth/account.model';
import { OnboardingProgressDto, OnboardingStatus, OnboardingSteps } from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressService } from './onboarding-progress.service';
import { ACCOUNT_STEP_FIELDS, WIZARD_PANES, WizardPane, WizardService } from './wizard.service';

const ALL_FALSE: OnboardingSteps = { account: false, profile: false, documents: false, consent: false };

/** A step-1-complete account: all four of `ACCOUNT_STEP_FIELDS` filled. */
const completeAccount = (): Account =>
  new Account(
    true,
    ['ROLE_USER'],
    'ama@example.com',
    'Ama',
    'en',
    'Mensah',
    'ama',
    'services/professionalservice/api/personal-document/d1/content',
  );

const progress = (overrides: Partial<OnboardingProgressDto> = {}): OnboardingProgressDto => ({
  percent: 0,
  complete: false,
  status: 'APPLICATION_STARTED',
  requirements: [],
  steps: ALL_FALSE,
  ...overrides,
});

describe('WizardService', () => {
  let service: WizardService;
  let progressService: OnboardingProgressService;
  let httpMock: HttpTestingController;

  const serveProgress = (dto: OnboardingProgressDto): void => {
    progressService.load();
    httpMock.expectOne(request => request.url.endsWith('api/onboarding/progress')).flush(dto);
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(WizardService);
    progressService = TestBed.inject(OnboardingProgressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should walk the four panes profile.md specifies, in its order', () => {
    expect(WIZARD_PANES).toEqual(['account', 'profile', 'documents', 'application']);
  });

  /**
   * `profile.md:275-277`: the first pane has no back button and the last has no next button but a
   * submit. Derived from the array rather than restated, so a fifth pane cannot leave this stale.
   */
  it('should give the first pane no previous and the last pane no next', () => {
    const first = WIZARD_PANES[0];
    const last = WIZARD_PANES[WIZARD_PANES.length - 1];

    expect(service.previous(first)).toBeNull();
    expect(service.next(last)).toBeNull();
    expect(service.next(first)).toBe(WIZARD_PANES[1]);
    expect(service.previous(last)).toBe(WIZARD_PANES[WIZARD_PANES.length - 2]);
  });

  it('should always allow the first pane, which has no predecessor to know anything about', () => {
    expect(service.canOpen('account')).toBe(true);
  });

  /**
   * The rule, walked: pane N is openable exactly when panes 1..N-1 have saved. Written as a loop over
   * `WIZARD_PANES` so it covers whatever the sequence is rather than four hand-written cases.
   */
  it('should open pane N only once every pane before it has saved', () => {
    service.setAccount(completeAccount());
    serveProgress(progress({ steps: { account: true, profile: true, documents: false, consent: false } }));

    // account and profile saved, documents not: panes 1-3 openable, pane 4 not.
    const openable: Record<WizardPane, boolean> = {
      account: service.canOpen('account'),
      profile: service.canOpen('profile'),
      documents: service.canOpen('documents'),
      application: service.canOpen('application'),
    };

    expect(openable).toEqual({ account: true, profile: true, documents: true, application: false });
  });

  it('should refuse pane 2 while step 1 is short of one of its four account fields', () => {
    const account = completeAccount();
    account.imageUrl = null;
    service.setAccount(account);
    serveProgress(progress({ steps: { account: true, profile: true, documents: true, consent: true } }));

    expect(service.accountStepComplete()).toBe(false);
    expect(service.canOpen('profile')).toBe(false);
  });

  /**
   * ⛔ Step 1 is read from the account and NOT from `steps.account`, which `backlog.md` row 233 is
   * open against: that projection can under-report for ever and never self-heal. Reading it would
   * lock pane 2 behind a Kafka frame that may never arrive. The fixture is the live quality state —
   * `steps.account: false` for a clinician whose four fields are in fact filled.
   */
  it('should judge step 1 by the account rather than by the meter projection row 233 is open against', () => {
    service.setAccount(completeAccount());
    serveProgress(progress({ steps: { ...ALL_FALSE, account: false } }));

    expect(service.accountStepComplete()).toBe(true);
    expect(service.canOpen('profile')).toBe(true);
  });

  /**
   * ⭐ **The stored milestone wins over the four-field inference** — `backlog.md` row 249: the gate
   * keys off a durable status rather than client state. The gateway writes `COMPLETED` when all four
   * are saved and never withdraws it, so an account carrying it is complete even with a field since
   * emptied — which is exactly the case the gateway's own `applyStepOneStatus` refuses to regress.
   */
  it('should accept the gateway stored COMPLETED over its own reading of the four fields', () => {
    const account = completeAccount();
    account.imageUrl = null;
    account.accountStatus = 'COMPLETED';
    service.setAccount(account);

    expect(service.accountStepComplete()).toBe(true);
  });

  /**
   * ⛔ **Only in the affirmative, and this is the case that pins it.** Every account that completed
   * step 1 before the gateway began stamping the field reads `null` here, and an older gateway
   * serves no such key at all — so reading "not COMPLETED" as "incomplete" would reopen step 1's
   * dialog over everyone who finished onboarding last month. The four fields answer it instead.
   */
  it('should fall back to the four fields when the gateway has stamped no status', () => {
    const notStamped = completeAccount();
    notStamped.accountStatus = null;
    service.setAccount(notStamped);
    expect(service.accountStepComplete()).toBe(true);

    const short = completeAccount();
    short.accountStatus = null;
    short.imageUrl = null;
    service.setAccount(short);
    expect(service.accountStepComplete()).toBe(false);
  });

  /**
   * ⚠ An administrative status is not an onboarding answer. A SUSPENDED account whose four fields
   * are filled has completed step 1; one short of a field has not. Neither reading comes from the
   * status, which is why both assertions are here rather than one.
   */
  it('should not read an administrative status as an answer about step 1', () => {
    const suspended = completeAccount();
    suspended.accountStatus = 'SUSPENDED';
    service.setAccount(suspended);
    expect(service.accountStepComplete()).toBe(true);

    const suspendedAndShort = completeAccount();
    suspendedAndShort.accountStatus = 'SUSPENDED';
    suspendedAndShort.langKey = '';
    service.setAccount(suspendedAndShort);
    expect(service.accountStepComplete()).toBe(false);
  });

  it('should treat a blank string as unfilled, the way the server reads "provided"', () => {
    const account = completeAccount();
    account.firstName = '   ';
    service.setAccount(account);

    expect(service.accountStepComplete()).toBe(false);
  });

  /**
   * Null, not false. A caller that read "not loaded yet" as "incomplete" would open step 1's dialog
   * over every clinician on arrival — the same distinction `OnboardingProgressService.complete`
   * draws.
   */
  it('should answer null for step 1 until the account has arrived', () => {
    expect(service.accountStepComplete()).toBeNull();
  });

  /**
   * ⚠ Pane 2 is deliberately NOT in this case. Its only predecessor is step 1, which is read from the
   * account and is therefore already answered — so pane 2 opens with no meter at all, which is the
   * behaviour row 233 requires. The meter-dependent panes are 3 and 4, and those are the ones that
   * must stay shut while the answer is unknown: admitting early walks an applicant into a save the
   * server refuses.
   */
  it('should fail closed and refuse the meter-dependent panes while the meter has not answered', () => {
    service.setAccount(completeAccount());

    expect(service.saved('documents')).toBeNull();
    expect(service.canOpen('documents')).toBe(false);
    expect(service.canOpen('application')).toBe(false);
  });

  /**
   * `api/OnboardingService:506-512` — a complete application already in `CREDENTIAL_REVIEW` that is
   * saved again is stored silently with no re-transition, and the profile and document writes are not
   * gated on application status. So after submission every pane reopens and stays editable.
   */
  it('should open every pane once the application has been submitted', () => {
    const account = completeAccount();
    account.imageUrl = null;
    service.setAccount(account);
    serveProgress(progress({ status: 'CREDENTIAL_REVIEW', steps: ALL_FALSE }));

    expect(service.submitted()).toBe(true);
    for (const pane of WIZARD_PANES) {
      expect(service.canOpen(pane)).toBe(true);
    }
  });

  it.each<OnboardingStatus>(['RETURNED_FOR_CORRECTION', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'REJECTED'])(
    'should count %s as submitted, because the state machine can only reach it through Submit',
    status => {
      service.setAccount(completeAccount());
      serveProgress(progress({ status, steps: ALL_FALSE }));

      expect(service.submitted()).toBe(true);
    },
  );

  it.each<OnboardingStatus>(['APPLICATION_STARTED', 'PROFILE_COMPLETED'])('should not count %s as submitted', status => {
    service.setAccount(completeAccount());
    serveProgress(progress({ status, steps: ALL_FALSE }));

    expect(service.submitted()).toBe(false);
  });

  /** `status: null` is "no application at all" — every admin-invited clinician — and is not submitted. */
  it('should not count an account with no application as submitted', () => {
    service.setAccount(completeAccount());
    serveProgress(progress({ status: null }));

    expect(service.submitted()).toBe(false);
  });

  it('should name the first outstanding pane, and nothing once all four are saved', () => {
    service.setAccount(completeAccount());
    serveProgress(progress({ steps: { account: false, profile: false, documents: true, consent: true } }));

    expect(service.firstOutstandingPane()).toBe('profile');

    progressService.refresh();
    httpMock
      .expectOne(request => request.url.endsWith('api/onboarding/progress'))
      .flush(progress({ steps: { account: true, profile: true, documents: true, consent: true } }));

    expect(service.firstOutstandingPane()).toBeNull();
  });

  it('should read step 1 from the account when naming the first outstanding pane', () => {
    const account = completeAccount();
    account.langKey = '';
    service.setAccount(account);
    serveProgress(progress({ steps: { account: true, profile: true, documents: true, consent: true } }));

    expect(service.firstOutstandingPane()).toBe('account');
  });

  it('should name the four account fields profile.md puts in step 1 trigger', () => {
    expect(ACCOUNT_STEP_FIELDS).toEqual(['firstName', 'lastName', 'langKey', 'imageUrl']);
  });

  /**
   * ⛔ The negative half of the post-submit rule, and the one a behavioural case cannot state: the
   * wizard must never attempt a backward status write, because `CREDENTIAL_REVIEW →
   * PROFILE_COMPLETED` is not in `LEGAL_TRANSITIONS` and the server answers 409. The guarantee is
   * that **there is no such call to make** — this service exposes sequencing and nothing else — so
   * the assertion is over the service's own surface, read from its source.
   *
   * <p>A method list rather than a grep for a verb: a method named `rewind` or `setStatus` added here
   * later fails this, and so does one that merely injects the API client the write would go through.
   */
  it('should expose no status write and no transport at all', () => {
    const source = readFileSync(join(__dirname, 'wizard.service.ts'), 'utf8');

    expect(source).not.toContain('OnboardingApiService');
    expect(source).not.toContain('HttpClient');
    expect(source).not.toMatch(/\bstatus\s*[:=]\s*['"]/);

    const surface = Object.getOwnPropertyNames(WizardService.prototype).filter(name => name !== 'constructor');
    expect(surface.sort()).toEqual(['canOpen', 'next', 'previous', 'saved', 'setAccount']);
  });

  /**
   * ⛔ And it must not navigate. The panes are routed overlays, so the router owns where the reader
   * is; a service that navigated too would be the second source of truth `profile-addendum.md` § 3 T8
   * names.
   */
  it('should not navigate', () => {
    const source = readFileSync(join(__dirname, 'wizard.service.ts'), 'utf8');

    // Code, not prose: the docblock says the words "does not navigate" and must go on being able to.
    // An import is how the router would arrive and a `.navigate(` is how it would be used, so both
    // forms are named rather than the bare word.
    expect(source).not.toMatch(/^import .*@angular\/router/m);
    expect(source).not.toMatch(/\.navigate(ByUrl)?\(/);
  });
});
