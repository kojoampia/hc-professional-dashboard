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
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { WIZARD_PROFILE_STORAGE_KEY, readWizardProfileId } from 'app/onboarding/wizard.service';
import { ADDRESS_INPUT_FIELDS } from 'app/entities/address/model';
import { CONTACT_INPUT_FIELDS, REQUIRED_CONTACTS } from 'app/entities/emergency-contact/model';
import { PersonalDocumentType } from 'app/entities/personal-document/types.enum';

import ProfileUpdateComponent from './profile-update.component';
import { Profile } from './model';
import { ProfileService } from './service';
import { Sex } from './sex.enum';

const account = (): Account => new Account(true, ['ROLE_USER'], 'ama@example.com', 'Ama', 'en', 'Mensah', 'ama', null);

const address = (): Record<string, string> => ({
  digitalAddress: 'GA-123-4567',
  streetAddress: '1 Old Road',
  town: 'Osu',
  city: 'Accra',
  district: 'Ayawaso East',
  region: 'Greater Accra',
  country: 'Ghana',
});

/** A profile satisfying every specified value, with the two contacts `profile.md:196` requires. */
const stored = (): Profile => ({
  id: 'p-1',
  accountId: 'acct-1',
  title: 'Dr',
  firstName: 'Ama',
  middleNames: 'Akosua',
  lastName: 'Mensah',
  birthDate: '1985-04-02',
  sex: Sex.FEMALE,
  mobilePhone: '+233200000000',
  phoneNumber: '+233300000000',
  email: 'ama@example.com',
  cardType: PersonalDocumentType.GHANACARD,
  cardNumber: 'GHA-123',
  address: address(),
  contacts: [
    { id: 'c-1', name: 'Kofi', relationship: 'Brother', email: 'kofi@example.com', phone: '+233200000001', address: address() },
    { id: 'c-2', name: 'Esi', relationship: 'Sister', email: 'esi@example.com', phone: '+233200000002', address: address() },
  ],
  status: 'PROFILE_COMPLETED',
});

describe('Profile Update Component — step 2', () => {
  let comp: ProfileUpdateComponent;
  let fixture: ComponentFixture<ProfileUpdateComponent>;
  let profileService: { find: jest.Mock; update: jest.Mock };
  let alertService: { showToast: jest.Mock };

  const build = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ProfileUpdateComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ProfileService, useValue: profileService },
        { provide: AlertService, useValue: alertService },
        { provide: AccountService, useValue: { identity: () => of(account()) } },
        { provide: OnboardingProgressService, useValue: { load: jest.fn(), refresh: jest.fn(), progress: () => null } },
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
      .overrideTemplate(ProfileUpdateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(ProfileUpdateComponent);
    comp = fixture.componentInstance;
  };

  beforeEach(async () => {
    sessionStorage.clear();
    profileService = {
      find: jest.fn().mockReturnValue(of(stored())),
      update: jest.fn().mockImplementation(profile => of({ ...profile, id: 'p-1' })),
    };
    alertService = { showToast: jest.fn() };
    await build();
  });

  it('should fill the form from the stored profile, including both contacts and their addresses', () => {
    comp.ngOnInit();

    expect(comp.loadState()).toBe('ready');
    const value = comp.form.getRawValue();
    expect(value.middleNames).toBe('Akosua');
    expect(value.phoneNumber).toBe('+233300000000');
    expect(value.sex).toBe(Sex.FEMALE);
    expect(value.address.city).toBe('Accra');
    expect(value.contacts).toHaveLength(2);
    expect(value.contacts[0].name).toBe('Kofi');
    expect(value.contacts[1].email).toBe('esi@example.com');
    expect(value.contacts[0].address.region).toBe('Greater Accra');
  });

  /** `profile.md:196` — at least two, and a new profile opens with two blank forms to fill. */
  it('should open a new profile with the minimum number of contact forms', () => {
    profileService.find.mockReturnValue(throwError(() => ({ status: 404 })));

    comp.ngOnInit();

    expect(comp.loadState()).toBe('ready');
    expect(comp.form.controls.contacts.length).toBe(REQUIRED_CONTACTS);
  });

  it('should top a stored profile that carries only one contact up to the minimum', () => {
    profileService.find.mockReturnValue(of({ ...stored(), contacts: [stored().contacts![0]] }));

    comp.ngOnInit();

    expect(comp.form.controls.contacts.length).toBe(REQUIRED_CONTACTS);
    expect(comp.form.controls.contacts.at(0).getRawValue().name).toBe('Kofi');
    expect(comp.form.controls.contacts.at(1).getRawValue().name).toBe('');
  });

  it('should append a blank contact on the add button', () => {
    comp.ngOnInit();

    comp.addContact();

    expect(comp.form.controls.contacts.length).toBe(3);
    expect(comp.contacts()).toHaveLength(3);
  });

  /** ⚠ Guarded in the component as well as hidden in the markup: a disabled control reached by
   * keyboard still fires, and dropping below two makes the pane unsaveable server-side. */
  it('should refuse to remove a contact below the minimum', () => {
    comp.ngOnInit();

    comp.removeContact(0);

    expect(comp.form.controls.contacts.length).toBe(REQUIRED_CONTACTS);
    expect(comp.removable()).toBe(false);
  });

  it('should remove a contact above the minimum', () => {
    comp.ngOnInit();
    comp.addContact();

    expect(comp.removable()).toBe(true);
    comp.removeContact(2);

    expect(comp.form.controls.contacts.length).toBe(REQUIRED_CONTACTS);
  });

  /**
   * ⛔ **THE payload case.** This pane writes the real `contacts` list, never the deprecated singular
   * `emergencyContact` alias the retired `ClinicalProfileComponent` wrote (dropped by T6) — the alias
   * could express one contact where the specification requires two, and carried neither an email nor
   * an address. What is asserted here is the MODEL handed to `ProfileService`; the service's own spec
   * holds the wire translation (`phone` ⟶ `phoneNumber`, `mobilePhone` ⟶ `mobileNumber`).
   */
  it('should send contacts as a list, with phoneNumber and middleNames, and never the deprecated alias', () => {
    comp.ngOnInit();

    comp.save();

    const sent = profileService.update.mock.calls[0][0] as Profile & { emergencyContact?: unknown };
    expect(sent.contacts).toHaveLength(2);
    expect(sent.contacts![0]).toEqual(
      expect.objectContaining({ id: 'c-1', name: 'Kofi', email: 'kofi@example.com', address: expect.objectContaining({ city: 'Accra' }) }),
    );
    expect(sent.phoneNumber).toBe('+233300000000');
    expect(sent.middleNames).toBe('Akosua');
    expect(sent.emergencyContact).toBeUndefined();
  });

  /**
   * ⛔ `accountId` is `@JsonProperty(READ_ONLY)` and forced from the token; `status` is refused by
   * name. Both arrive on the loaded row, so the spread would carry them back unless they are
   * cleared.
   */
  it('should not send accountId or status, which the server owns', () => {
    comp.ngOnInit();

    comp.save();

    const sent = profileService.update.mock.calls[0][0] as Profile;
    expect(sent.accountId).toBeUndefined();
    expect(sent.status).toBeUndefined();
    // The row's own id does go, so the write lands on the right document.
    expect(sent.id).toBe('p-1');
  });

  /** The three account-sourced names are prefilled and sent — a new profile needs them. */
  it('should carry the account-sourced names through to the payload', () => {
    profileService.find.mockReturnValue(throwError(() => ({ status: 404 })));
    comp.ngOnInit();
    comp.form.patchValue({ middleNames: 'A', birthDate: '1990-01-01', sex: Sex.MALE, mobilePhone: '1', phoneNumber: '2' });
    comp.form.patchValue({ cardType: PersonalDocumentType.PASSPORT, cardNumber: 'X' });
    comp.form.controls.address.patchValue(address());
    for (const contact of comp.form.controls.contacts.controls) {
      contact.patchValue({ name: 'N', relationship: 'R', email: 'n@example.com', phone: 'P' });
      contact.controls.address.patchValue(address());
    }

    comp.save();

    const sent = profileService.update.mock.calls[0][0] as Profile;
    expect(sent.firstName).toBe('Ama');
    expect(sent.lastName).toBe('Mensah');
    expect(sent.email).toBe('ama@example.com');
  });

  it('should refuse to save an incomplete form and send nothing', () => {
    comp.ngOnInit();
    comp.form.controls.address.patchValue({ city: '' });

    comp.save();

    expect(profileService.update).not.toHaveBeenCalled();
    expect(comp.showGaps()).toBe(true);
  });

  /**
   * `profile.md:202` — *"keep the saved profile in session storage and open the next dialog"*. The
   * open is the applicant's (Next); the store is here, because this is where the id is.
   */
  it('should keep the saved profile id in session storage', () => {
    comp.ngOnInit();

    comp.save();

    expect(readWizardProfileId()).toBe('p-1');
    expect(alertService.showToast).toHaveBeenCalledWith('healthConnect.onboarding.wizard.toast.profileSaved');
  });

  /**
   * ⛔ **THE id, and nothing else.** This stored the whole saved document — 39 fields including
   * `cardNumber`, `birthDate` and **both next of kin's home addresses** — while the docblock above
   * the helper quoted `profile-addendum.md` saying *"step 3 needs just `Profile.id`"*. Nothing read
   * any other field, nothing cleared it on sign-out, and `sessionStorage` survives a sign-out. The
   * assertion is over the stored JSON rather than over the reader, because the reader was never the
   * problem.
   */
  it('should put nothing but the id on the wire into session storage', () => {
    comp.ngOnInit();

    comp.save();

    const raw = sessionStorage.getItem(WIZARD_PROFILE_STORAGE_KEY)!;
    expect(JSON.parse(raw)).toEqual({ id: 'p-1' });
    for (const leaked of ['GHA-123', '1985-04-02', '+233200000000', 'Kofi', 'Ayawaso East']) {
      expect(raw).not.toContain(leaked);
    }
  });

  /** A profile the server answered without an id cannot be a cursor, so nothing is written. */
  it('should store nothing when the saved profile carries no id', () => {
    profileService.update.mockImplementation(profile => of({ ...profile, id: null }));
    comp.ngOnInit();

    comp.save();

    expect(sessionStorage.getItem(WIZARD_PROFILE_STORAGE_KEY)).toBeNull();
  });

  describe('the gap summary', () => {
    /**
     * Quiet on arrival with an INCOMPLETE profile loaded — the path a guard that stubs the read to
     * 404 cannot reach, because `prefill` never runs there. That exact omission is recorded on
     * `ClinicalProfileComponent.edits`.
     */
    it('should show no gaps on arrival even when the stored profile is incomplete', () => {
      profileService.find.mockReturnValue(of({ ...stored(), address: { ...address(), city: '' } }));

      comp.ngOnInit();

      expect(comp.outstandingTotal()).toBe(1);
      expect(comp.showGaps()).toBe(false);
    });

    /** Grouped by section, which is how the server groups its own refusal — three keys, not 39. */
    it('should count the gaps per section once the applicant edits', () => {
      comp.ngOnInit();
      comp.form.patchValue({ mobilePhone: '', phoneNumber: '' });
      comp.form.controls.address.patchValue({ city: '', town: '' });
      comp.form.controls.contacts.at(0).patchValue({ phone: '' });

      expect(comp.outstandingBySection()).toEqual({ identity: 0, personal: 2, address: 2, contacts: 1 });
      expect(comp.outstandingTotal()).toBe(5);
      expect(comp.showGaps()).toBe(true);
    });

    /** A contact's nested address counts too — 11 values per contact, not four. */
    it('should count a contact address field as a contact gap', () => {
      comp.ngOnInit();
      comp.form.controls.contacts.at(1).controls.address.patchValue({ country: '' });

      expect(comp.outstandingBySection().contacts).toBe(1);
    });

    /** `identity` is always 0 — prefilled and read-only — and stays in the record all the same. */
    it('should keep the prefilled section in the record at zero', () => {
      comp.ngOnInit();

      expect(comp.outstandingBySection().identity).toBe(0);
      expect(comp.outstandingSummary().map(row => row.section)).not.toContain('identity');
    });

    /** `title` is the one optional scalar — specified nowhere in the model table. */
    it('should not count the optional title as a gap', () => {
      comp.ngOnInit();
      comp.form.patchValue({ title: '' });

      expect(comp.outstandingTotal()).toBe(0);
    });
  });

  /**
   * ⭐ Every required control is accounted for, derived from the two models rather than counted by
   * hand: 7 profile scalars + 7 address + REQUIRED_CONTACTS × (4 + 7). `profile-addendum.md` § 3 T8
   * says 36 at two contacts, and a hand-maintained tally is what this derivation replaces.
   */
  it('should require exactly the inputs the models declare', () => {
    comp.ngOnInit();

    const expected = 7 + ADDRESS_INPUT_FIELDS.length + REQUIRED_CONTACTS * (CONTACT_INPUT_FIELDS.length + ADDRESS_INPUT_FIELDS.length);
    expect(expected).toBe(36);

    comp.form.reset();
    expect(comp.outstandingTotal()).toBe(expected);
  });
});

/** ⭐ Rendered against the real catalogues in all four languages — see the step-1 spec for why. */
describe('Profile Update Component — rendered in four languages', () => {
  const catalogue = (locale: string): Record<string, unknown> =>
    JSON.parse(readFileSync(resolve(__dirname, `../../../i18n/${locale}/healthConnect.json`), 'utf8')) as Record<string, unknown>;
  const globalCatalogue = (locale: string): Record<string, unknown> =>
    JSON.parse(readFileSync(resolve(__dirname, `../../../i18n/${locale}/global.json`), 'utf8')) as Record<string, unknown>;
  const settings = (locale: string): Record<string, unknown> =>
    JSON.parse(readFileSync(resolve(__dirname, `../../../i18n/${locale}/settings.json`), 'utf8')) as Record<string, unknown>;

  const render = async (locale: string, options: { newProfile?: boolean } = {}): Promise<ComponentFixture<ProfileUpdateComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProfileUpdateComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ProfileService,
          useValue: options.newProfile
            ? // The applicant's own path: no profile yet, and the first save is what assigns the id
              // and the accountId.
              { find: () => throwError(() => ({ status: 404 })), update: (p: Profile) => of({ ...p, id: 'p-1', accountId: 'acct-1' }) }
            : { find: () => of(stored()), update: (p: Profile) => of(p) },
        },
        { provide: AlertService, useValue: { showToast: jest.fn() } },
        { provide: AccountService, useValue: { identity: () => of(account()) } },
        { provide: OnboardingProgressService, useValue: { load: jest.fn(), refresh: jest.fn(), progress: () => null } },
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(locale, { ...catalogue(locale), ...globalCatalogue(locale), ...settings(locale) });
    translate.use(locale);

    const fixture = TestBed.createComponent(ProfileUpdateComponent);
    fixture.detectChanges();
    return fixture;
  };

  it.each(LANGUAGES)('should render step 2 in %s with no raw translation keys', async locale => {
    const fixture = await render(locale);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    const wizard = (
      catalogue(locale) as { healthConnect: { onboarding: { wizard: { profile: Record<string, Record<string, string> & string> } } } }
    ).healthConnect.onboarding.wizard.profile;
    expect(text).toContain(wizard.title);
    expect(text).toContain(wizard.sections.contacts);
    expect(text).not.toContain('healthConnect.onboarding');
    expect(text).not.toContain('entity.validation');
  });

  /**
   * `profile.md:187-194` — prefilled from the account and read-only.
   *
   * <p>⛔ **`readonly` and NOT `disabled`, and this case asserted `disabled: true` until review.** A
   * disabled input is removed from the tab order and from the accessibility tree, so four fields the
   * specification says to *show* were unreachable by keyboard and unreadable by a screen reader — a
   * sighted reader could see whose profile this is and a blind one could not. The negative assertion
   * is kept explicitly so putting `disabled` back goes red.
   */
  it('should render the four prefilled fields readonly, and reachable', async () => {
    const fixture = await render('en');
    const element = fixture.nativeElement as HTMLElement;

    for (const hook of ['profileStepFirstName', 'profileStepLastName', 'profileStepEmail', 'profileStepAccountId']) {
      const input = element.querySelector<HTMLInputElement>(`[data-cy="${hook}"]`);
      expect(input).not.toBeNull();
      expect(input!.readOnly).toBe(true);
      expect(input!.disabled).toBe(false);
    }
    expect(element.querySelector<HTMLInputElement>('[data-cy="profileStepFirstName"]')!.value).toBe('Ama');
    expect(element.querySelector<HTMLInputElement>('[data-cy="profileStepAccountId"]')!.value).toBe('acct-1');
  });

  /**
   * ⛔ **The rendered `accountId`, which is the assertion that was missing.** `accountId()` is a
   * `computed` over what used to be a plain field, so it was evaluated once and never again: for a
   * **new** applicant — 404, then a first save that returns the real `accountId` — the field stayed
   * blank for ever. Nothing failed, because a read-only field carries no write, which is precisely
   * why only a rendered case can catch it. `loadedProfile` is a signal now.
   */
  it('should fill the account reference after the first save of a new profile', async () => {
    const fixture = await render('en', { newProfile: true });
    const comp = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLInputElement>('[data-cy="profileStepAccountId"]')!.value).toBe('');

    comp.form.patchValue({ middleNames: 'A', birthDate: '1990-01-01', sex: Sex.MALE, mobilePhone: '1', phoneNumber: '2' });
    comp.form.patchValue({ cardType: PersonalDocumentType.PASSPORT, cardNumber: 'X' });
    comp.form.controls.address.patchValue(address());
    for (const contact of comp.form.controls.contacts.controls) {
      contact.patchValue({ name: 'N', relationship: 'R', email: 'n@example.com', phone: 'P' });
      contact.controls.address.patchValue(address());
    }
    comp.save();
    fixture.detectChanges();

    expect(comp.accountId()).toBe('acct-1');
    expect(element.querySelector<HTMLInputElement>('[data-cy="profileStepAccountId"]')!.value).toBe('acct-1');
  });

  /** The ✚ button and a section anchor per gap row — the navigable summary, not a wall of 36 names. */
  it('should render an add-contact button and a navigable gap summary', async () => {
    const fixture = await render('en');
    const comp = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-cy="profileStepAddContact"]')).not.toBeNull();
    expect(element.querySelector('[data-cy="profileStepGaps"]')).toBeNull();

    comp.form.controls.address.patchValue({ city: '' });
    fixture.detectChanges();

    const gaps = element.querySelector('[data-cy="profileStepGaps"]');
    expect(gaps).not.toBeNull();
    const anchor = gaps!.querySelector<HTMLAnchorElement>('a');
    expect(anchor!.getAttribute('href')).toBe('#profile-section-address');
    expect(element.querySelector('#profile-section-address')).not.toBeNull();
  });

  it('should render a contact block per contact, each with its own address fields', async () => {
    const fixture = await render('en');
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('[data-cy^="profileStepContact-"]')).toHaveLength(REQUIRED_CONTACTS);
    expect(element.querySelectorAll('[data-cy="profileStepContactAddress-country"]')).toHaveLength(REQUIRED_CONTACTS);
  });
});
