import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { of, throwError } from 'rxjs';

import { LANGUAGES } from 'app/config/language.constants';
import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { AlertService } from 'app/core/util/alert.service';
import { AvatarDocumentDto, OnboardingApiService } from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { PersonalDocumentType } from 'app/entities/personal-document/types.enum';

import UserUpdateComponent from './user-update.component';
import { UserAccountService } from './user-account.service';
import * as avatarImage from './avatar-image';

const CONTENT_PATH = 'services/professionalservice/api/personal-document/doc-1/content';

const incomplete = (): Account => new Account(true, ['ROLE_USER'], 'ama@example.com', null, 'en', null, 'ama', null);
const complete = (): Account => new Account(true, ['ROLE_USER'], 'ama@example.com', 'Ama', 'en', 'Mensah', 'ama', CONTENT_PATH);

const avatarRow = (): AvatarDocumentDto => ({ id: 'doc-1', name: 'avatar.jpg', type: PersonalDocumentType.AVATAR });

describe('User Update Component — step 1', () => {
  let comp: UserUpdateComponent;
  let fixture: ComponentFixture<UserUpdateComponent>;
  let accountService: { identity: jest.Mock; authenticate: jest.Mock };
  let userAccountService: { updateUserAccount: jest.Mock };
  let onboardingApi: { uploadAvatar: jest.Mock; avatarContentPath: jest.Mock };
  let alertService: { showToast: jest.Mock };
  // `progress` is on the stub because WizardService — reached through the footer — reads it. A
  // narrower stub passed the signal-level suite and failed the rendered one, which is the whole
  // argument for rendering at all.
  let progressService: { load: jest.Mock; refresh: jest.Mock; progress: jest.Mock };

  const build = async (renderTemplate = false): Promise<void> => {
    const configured = TestBed.configureTestingModule({
      imports: [UserUpdateComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AccountService, useValue: accountService },
        { provide: UserAccountService, useValue: userAccountService },
        { provide: OnboardingApiService, useValue: onboardingApi },
        { provide: AlertService, useValue: alertService },
        { provide: OnboardingProgressService, useValue: progressService },
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    await (renderTemplate ? configured : configured.overrideTemplate(UserUpdateComponent, '')).compileComponents();

    fixture = TestBed.createComponent(UserUpdateComponent);
    comp = fixture.componentInstance;
  };

  beforeEach(async () => {
    accountService = { identity: jest.fn().mockReturnValue(of(complete())), authenticate: jest.fn() };
    userAccountService = { updateUserAccount: jest.fn().mockReturnValue(of(undefined)) };
    onboardingApi = {
      uploadAvatar: jest.fn().mockReturnValue(of(avatarRow())),
      avatarContentPath: jest.fn().mockReturnValue(CONTENT_PATH),
    };
    alertService = { showToast: jest.fn() };
    progressService = { load: jest.fn(), refresh: jest.fn(), progress: jest.fn().mockReturnValue(null) };
    await build();
  });

  afterEach(() => jest.restoreAllMocks());

  it('should fill the form from the account', () => {
    comp.ngOnInit();

    expect(comp.loadState()).toBe('ready');
    expect(comp.form.getRawValue()).toEqual({ firstName: 'Ama', lastName: 'Mensah', langKey: 'en' });
  });

  /**
   * `profile.md:174-178` — first name, last name and language. ⚠ The avatar is step 1's fourth
   * required value and deliberately **not** a form control: it is uploaded rather than typed, and a
   * `Validators.required` on a control nothing sets would disable Save for a value already stored.
   */
  it('should require the three typed fields and offer no control for the avatar', () => {
    const controls = Object.keys(comp.form.controls);

    expect(controls).toEqual(['firstName', 'lastName', 'langKey']);
    for (const name of controls) {
      comp.form.get(name)!.setValue('');
      expect(comp.form.get(name)!.invalid).toBe(true);
    }
  });

  /** ⛔ `email` is sent and is not an input: changing it is an identity change with its own 400. */
  it('should carry the account email through without offering an input for it', () => {
    comp.ngOnInit();

    comp.save();

    expect(comp.form.contains('email')).toBe(false);
    expect(userAccountService.updateUserAccount.mock.calls[0][0].email).toBe('ama@example.com');
  });

  it('should save the three typed fields merged onto the stored account', () => {
    comp.ngOnInit();
    comp.form.patchValue({ firstName: 'Akua', lastName: 'Boateng', langKey: 'fr' });

    comp.save();

    expect(userAccountService.updateUserAccount).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Akua', lastName: 'Boateng', langKey: 'fr', login: 'ama', imageUrl: CONTENT_PATH }),
    );
    expect(alertService.showToast).toHaveBeenCalledWith('healthConnect.onboarding.wizard.toast.accountSaved');
    expect(progressService.refresh).toHaveBeenCalled();
  });

  it('should refuse to save an incomplete form and send nothing', () => {
    accountService.identity.mockReturnValue(of(incomplete()));
    comp.ngOnInit();

    comp.save();

    expect(userAccountService.updateUserAccount).not.toHaveBeenCalled();
    expect(comp.form.controls.firstName.touched).toBe(true);
  });

  it('should re-publish the account locally so the sidebar card follows', () => {
    comp.ngOnInit();
    comp.form.patchValue({ firstName: 'Akua' });

    comp.save();

    expect(accountService.authenticate).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Akua' }));
  });

  describe('the avatar', () => {
    beforeEach(() => {
      jest.spyOn(avatarImage, 'prepareAvatar').mockResolvedValue({ data: 'QUJD', dataContentType: 'image/jpeg', width: 1024, height: 768 });
    });

    /**
     * ⭐ **THE ordering case.** `api/` returns a document id and the gateway stores a path; a
     * replacement **changes the id** and deletes the previous row, so `imageUrl` must be written
     * immediately after the upload. Reversed, or deferred to Save, and `imageUrl` names a document
     * that no longer exists for as long as the applicant does not press Save.
     */
    it('should upload the avatar and then PUT the account with its content path, in that order', async () => {
      comp.ngOnInit();

      comp.chooseAvatar([new File([''], 'me.jpg', { type: 'image/jpeg' })]);
      await Promise.resolve();
      await Promise.resolve();

      expect(onboardingApi.uploadAvatar).toHaveBeenCalledWith('QUJD', 'image/jpeg');
      expect(onboardingApi.avatarContentPath).toHaveBeenCalledWith('doc-1');
      expect(userAccountService.updateUserAccount).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: CONTENT_PATH }));
      expect(onboardingApi.uploadAvatar.mock.invocationCallOrder[0]).toBeLessThan(
        userAccountService.updateUserAccount.mock.invocationCallOrder[0],
      );
      expect(alertService.showToast).toHaveBeenCalledWith('healthConnect.onboarding.wizard.toast.avatarSaved');
    });

    /**
     * ⛔ The account write that follows the upload carries the **loaded** account, not the form: the
     * applicant may not have typed their name when they choose a photograph, and `PUT /api/account`
     * is a replace with no null guards beyond `email`.
     */
    it('should not write the half-filled form when the avatar is uploaded first', async () => {
      accountService.identity.mockReturnValue(of(incomplete()));
      comp.ngOnInit();
      comp.form.patchValue({ firstName: 'typed but not saved' });

      comp.chooseAvatar([new File([''], 'me.jpg', { type: 'image/jpeg' })]);
      await Promise.resolve();
      await Promise.resolve();

      const sent = userAccountService.updateUserAccount.mock.calls[0][0] as Account;
      expect(sent.firstName).toBeNull();
      expect(sent.imageUrl).toBe(CONTENT_PATH);
    });

    it('should downscale through prepareAvatar rather than sending the chosen file', async () => {
      comp.ngOnInit();

      comp.chooseAvatar([new File([''], 'me.jpg', { type: 'image/jpeg' })]);
      await Promise.resolve();

      expect(avatarImage.prepareAvatar).toHaveBeenCalled();
    });

    it('should report a file the browser could not read, and send nothing', async () => {
      jest.spyOn(avatarImage, 'prepareAvatar').mockRejectedValue(new DOMException('', 'InvalidStateError'));
      comp.ngOnInit();

      comp.chooseAvatar([new File([''], 'me.jpg', { type: 'image/jpeg' })]);
      await Promise.resolve();
      await Promise.resolve();

      expect(onboardingApi.uploadAvatar).not.toHaveBeenCalled();
      expect(alertService.showToast).toHaveBeenCalledWith('healthConnect.onboarding.wizard.avatarUnreadable');
      expect(comp.uploading()).toBe(false);
    });

    it('should leave the upload idle again when the server refuses it', async () => {
      onboardingApi.uploadAvatar.mockReturnValue(throwError(() => ({ status: 400 })));
      comp.ngOnInit();

      comp.chooseAvatar([new File([''], 'me.jpg', { type: 'image/jpeg' })]);
      await Promise.resolve();
      await Promise.resolve();

      expect(userAccountService.updateUserAccount).not.toHaveBeenCalled();
      expect(comp.uploading()).toBe(false);
    });
  });

  /**
   * ⛔ Four in the trigger over three in the form is a dialog that reopens for ever
   * (`profile-addendum.md` § 5 Q12). Step 1 is complete only when the avatar is there too.
   */
  it('should not read as complete while the account has no avatar', () => {
    accountService.identity.mockReturnValue(of(new Account(true, [], 'ama@example.com', 'Ama', 'en', 'Mensah', 'ama', null)));
    comp.ngOnInit();

    expect(comp.accountComplete()).toBe(false);
  });

  it('should read as complete once all four fields are filled', () => {
    comp.ngOnInit();

    expect(comp.accountComplete()).toBe(true);
  });
});

/**
 * ⭐ **Rendered against the real catalogues, in all four languages.** The suite above overrides the
 * template, so it says nothing about whether the markup exists, is bound, or translates. ngx-translate
 * renders a missing key as the key itself and throws nothing, so an English-only pass looks perfect —
 * which is what this catches.
 */
describe('User Update Component — rendered in four languages', () => {
  const catalogue = (locale: string): Record<string, unknown> =>
    JSON.parse(readFileSync(resolve(__dirname, `../../../i18n/${locale}/healthConnect.json`), 'utf8')) as Record<string, unknown>;
  const settings = (locale: string): Record<string, unknown> =>
    JSON.parse(readFileSync(resolve(__dirname, `../../../i18n/${locale}/settings.json`), 'utf8')) as Record<string, unknown>;

  const render = async (locale: string): Promise<ComponentFixture<UserUpdateComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UserUpdateComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AccountService, useValue: { identity: () => of(complete()), authenticate: jest.fn() } },
        { provide: UserAccountService, useValue: { updateUserAccount: () => of(undefined) } },
        { provide: OnboardingApiService, useValue: { uploadAvatar: jest.fn(), avatarContentPath: jest.fn() } },
        { provide: AlertService, useValue: { showToast: jest.fn() } },
        { provide: OnboardingProgressService, useValue: { load: jest.fn(), refresh: jest.fn(), progress: () => null } },
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(locale, { ...catalogue(locale), ...settings(locale) });
    translate.use(locale);

    const fixture = TestBed.createComponent(UserUpdateComponent);
    fixture.detectChanges();
    return fixture;
  };

  it.each(LANGUAGES)('should render step 1 in %s with no raw translation keys', async locale => {
    const fixture = await render(locale);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    const wizard = (catalogue(locale) as { healthConnect: { onboarding: { wizard: { account: Record<string, string> } } } }).healthConnect
      .onboarding.wizard.account;
    expect(text).toContain(wizard.title);
    expect(text).toContain(wizard.subtitle);
    expect(text).toContain(wizard.photo);
    // ngx-translate prints the key when it has no value, so a raw key on screen is a missing one.
    expect(text).not.toContain('healthConnect.onboarding.wizard');
    expect(text).not.toContain('settings.form');
  });

  /**
   * ⭐ **The language options are ENDONYMS**, from `findLanguageFromKey` — not catalogue entries. A
   * language's name is rendered in its own language and never translated per locale, so these four
   * strings must be identical in every locale's render. ⛔ `profile-addendum.md` § 2's correction
   * block is why this is asserted rather than assumed: the opposite claim stood in that document and
   * would have had four translated copies added.
   */
  it('should offer the four languages as endonyms, the same in every locale', async () => {
    const seen: string[][] = [];
    for (const locale of LANGUAGES) {
      const fixture = await render(locale);
      const options = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLOptionElement>('[data-cy="accountStepLangKey"] option'),
      );
      seen.push(options.map(option => option.textContent!.trim()).filter(Boolean));
    }

    expect(seen[0]).toEqual(['English', 'Español', 'Français', 'Deutsch']);
    for (const rendered of seen) {
      expect(rendered).toEqual(seen[0]);
    }
  });
});
