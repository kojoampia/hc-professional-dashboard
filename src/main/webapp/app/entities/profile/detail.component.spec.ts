import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';
import { of, throwError } from 'rxjs';

import 'app/config/dayjs';
import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { OnboardingApplicationDto, OnboardingDocumentDto } from 'app/health-connect/api/onboarding-api.service';
import { ApplicationService } from 'app/entities/application/service';
import { PersonalDocumentService } from 'app/entities/personal-document/service';
import { PersonalDocumentType } from 'app/entities/personal-document/types.enum';
import { Sex } from 'app/entities/profile/sex.enum';

import ProfileDetailComponent from './detail.component';
import { Profile } from './model';
import { ProfileService } from './service';
import profileRoute from 'app/entities/profile/profile.route';

/**
 * Rendered against the REAL template rather than the `.overrideTemplate(Comp, '')` idiom, on
 * purpose: T9's named assertions — the spec's field order, Q31's qualifier, the preview column —
 * are claims about what reaches the screen, and a signal-level suite cannot see a template quietly
 * dropping the qualifier. `TranslateModule.forRoot()` loads no catalogue, so a key renders as
 * itself, which is exactly what makes "which key did the template use" assertable; the i18n gates
 * under `app/core/i18n/` separately prove every key exists in all four locales.
 */
const account = (authorities: string[]): Account => new Account(true, authorities, 'ama@localhost', 'Ama', 'en', 'Mensah', 'ama', null);

const storedProfile: Profile = {
  id: 'prof-1',
  accountId: 'acc-1',
  title: 'RN',
  firstName: 'Ama',
  middleNames: 'Serwaa',
  lastName: 'Mensah',
  birthDate: '1988-05-04',
  sex: Sex.FEMALE,
  mobilePhone: '+233200000000',
  phoneNumber: '+233302000000',
  email: 'ama@localhost',
  address: {
    digitalAddress: 'GA-123-4567',
    streetAddress: '1 Old Road',
    town: 'Osu',
    city: 'Accra',
    district: 'Ayawaso East',
    region: 'Greater Accra',
    country: 'Ghana',
  },
  cardType: PersonalDocumentType.GHANACARD,
  cardNumber: 'GHA-123',
  contacts: [
    {
      id: 'c-1',
      name: 'Kofi Mensah',
      relationship: 'Brother',
      phone: '+233200000001',
      email: 'kofi@localhost',
      address: { city: 'Accra' },
    },
    { id: 'c-2', name: 'Esi Mensah', relationship: 'Mother', phone: '+233200000002', email: 'esi@localhost', address: { city: 'Kumasi' } },
  ],
  status: 'ACTIVE',
};

const storedApplication: OnboardingApplicationDto = {
  id: 'app-1',
  accountId: 'acc-1',
  authority: 'ROLE_NURSE',
  status: 'CREDENTIAL_REVIEW',
  agreed: true,
  agreedDate: '2026-03-12T09:30:00Z',
};

const storedDocuments: OnboardingDocumentDto[] = [
  { id: 'doc-1', name: 'Passport', type: 'PASSPORT' },
  { id: 'doc-2', name: 'Nursing certificate', type: 'CERTIFICATE' },
];

describe('Profile Detail Component', () => {
  let fixture: ComponentFixture<ProfileDetailComponent>;
  let comp: ProfileDetailComponent;
  let accountService: { identity: jest.Mock };
  let profileService: { find: jest.Mock };
  let applicationService: { find: jest.Mock };
  let personalDocumentService: { query: jest.Mock; content: jest.Mock };
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  const build = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ProfileDetailComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AccountService, useValue: accountService },
        { provide: ProfileService, useValue: profileService },
        { provide: ApplicationService, useValue: applicationService },
        { provide: PersonalDocumentService, useValue: personalDocumentService },
        // For the hpd-account-avatar child, which fetches its photograph itself.
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileDetailComponent);
    comp = fixture.componentInstance;
  };

  const text = (selector: string): string | null => {
    const element = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
    return element ? element.textContent!.trim() : null;
  };

  beforeEach(async () => {
    let urls = 0;
    createObjectURL = jest.fn().mockImplementation(() => `blob:preview-${++urls}`);
    revokeObjectURL = jest.fn();
    // jsdom implements neither, so both are installed rather than spied on.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;

    accountService = { identity: jest.fn().mockReturnValue(of(account(['ROLE_NURSE']))) };
    profileService = { find: jest.fn().mockReturnValue(of({ ...storedProfile })) };
    applicationService = { find: jest.fn().mockReturnValue(of({ ...storedApplication })) };
    personalDocumentService = {
      query: jest.fn().mockReturnValue(of([...storedDocuments])),
      content: jest.fn().mockReturnValue(of(new Blob(['x'], { type: 'image/png' }))),
    };
    await build();
  });

  afterEach(() => {
    dayjs.locale('en');
  });

  it('should render the five sections of profile.md § Profile detail view', () => {
    fixture.detectChanges();

    for (const section of [
      'profileHeaderSection',
      'personalDetailsSection',
      'personalDocumentsSection',
      'emergencyContactsSection',
      'consentSection',
    ]) {
      expect(fixture.nativeElement.querySelector(`[data-cy="${section}"]`)).not.toBeNull();
    }
  });

  it("should render the header row from the profile: title, full name with middle names, and the profile's status", () => {
    fixture.detectChanges();

    expect(text('[data-cy="profileTitle"]')).toBe('RN');
    expect(text('[data-cy="profileFullName"]')).toBe('Ama Serwaa Mensah');
    // ACTIVE is in the derived vocabulary, so the label key renders — never the raw identifier.
    expect(text('[data-cy="profileStatus"]')).toBe('healthConnect.profile.detail.profileStatus.ACTIVE');
  });

  /**
   * The fallback half of the status cell: a value outside {@link PROFILE_STATUS_VALUES} — which the
   * wire can carry the moment the Java enum moves ahead of this build — renders as its raw
   * identifier, never as a literal `healthConnect.…` key mid-screen (ngx-translate's missing-key
   * behaviour) and never as nothing.
   */
  it('should render a status this build has no label for as its raw identifier, not a translation key', () => {
    profileService.find.mockReturnValue(of({ ...storedProfile, status: 'RETIRED_VALUE' }));
    fixture.detectChanges();

    expect(comp.statusKey()).toBeNull();
    expect(text('[data-cy="profileStatus"]')).toBe('RETIRED_VALUE');
  });

  it("should list section 2's ten fields in the specification's order (profile.md:128-138)", () => {
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('[data-cy="personalDetails"] dt') as NodeListOf<HTMLElement>).map(dt =>
      dt.getAttribute('jhiTranslate'),
    );
    expect(labels).toEqual([
      'healthConnect.profile.detail.fields.language',
      'healthConnect.onboarding.fields.birthDate',
      'healthConnect.onboarding.fields.sex',
      'healthConnect.profile.detail.fields.login',
      'healthConnect.onboarding.fields.mobilePhone',
      'healthConnect.profile.detail.fields.phoneNumber',
      'healthConnect.profile.detail.fields.email',
      'healthConnect.profile.detail.fields.address',
      'healthConnect.onboarding.fields.cardType',
      'healthConnect.onboarding.fields.cardNumber',
    ]);
  });

  it('should render the emergency contacts one row per contact', () => {
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-cy="contactRow"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Kofi Mensah');
    expect(rows[1].textContent).toContain('Esi Mensah');
  });

  /**
   * Q31 (owner, 2026-10-16), the granted half: an account holding a clinical authority renders it as
   * itself — no qualifier, because the token really carries the capability.
   */
  it('should render a granted clinical authority as granted, with no requested qualifier', () => {
    fixture.detectChanges();

    expect(comp.authorityBadge()).toEqual({ labelKey: 'healthConnect.roles.nurse', requested: false });
    expect(text('[data-cy="profileAuthorityGranted"]')).toBe('healthConnect.roles.nurse');
    expect(fixture.nativeElement.querySelector('[data-cy="profileAuthorityRequested"]')).toBeNull();
  });

  /**
   * Q31, the requested half — and the qualifier is the assertion, not the role string: rendering the
   * requested role bare would assert a capability the token does not carry, which is the shape the
   * owner rejected. A mutation that drops the qualifier (collapsing the template's requested branch
   * into the granted one) turns this red twice over — the requested element disappears and the bare
   * role key appears under the granted hook.
   */
  it('should render a ROLE_USER-only applicant’s requested role only through the explicit requested qualifier', () => {
    accountService.identity.mockReturnValue(of(account(['ROLE_USER'])));
    fixture.detectChanges();

    expect(comp.authorityBadge()).toEqual({ labelKey: 'healthConnect.roles.nurse', requested: true });
    // The qualifier key is what reaches the screen; the bare role key alone must not.
    expect(text('[data-cy="profileAuthorityRequested"]')).toBe('healthConnect.profile.detail.requestedRole');
    expect(fixture.nativeElement.querySelector('[data-cy="profileAuthorityGranted"]')).toBeNull();
  });

  it('should render no authority at all for an applicant with no application', () => {
    accountService.identity.mockReturnValue(of(account(['ROLE_USER'])));
    applicationService.find.mockReturnValue(throwError(() => ({ status: 404 })));
    fixture.detectChanges();

    expect(comp.authorityBadge()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="profileAuthorityGranted"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="profileAuthorityRequested"]')).toBeNull();
  });

  it('should render the empty state for the ordinary no-profile-yet 404, not the error state', () => {
    profileService.find.mockReturnValue(throwError(() => ({ status: 404 })));
    fixture.detectChanges();

    expect(comp.profileState()).toBe('empty');
    expect(fixture.nativeElement.querySelector('[data-cy="noProfileYet"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="profileLoadError"]')).toBeNull();
  });

  it('should render the error state for a profile read that failed, never an empty profile', () => {
    profileService.find.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();

    expect(comp.profileState()).toBe('error');
    expect(fixture.nativeElement.querySelector('[data-cy="profileLoadError"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="noProfileYet"]')).toBeNull();
  });

  it('should render the consented sentence with the agreed date, locale-formatted', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="consentAgreed"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="consentNotAgreed"]')).toBeNull();
    expect(comp.consentParams()).toEqual({ date: '12 Mar 2026' });

    // The format follows the active dayjs locale, which the language switcher sets globally.
    dayjs.locale('fr');
    expect(comp.consentParams().date).toBe('12 mars 2026');
  });

  it('should render the not-consented sentence when there is no application, which truthfully means no consent', () => {
    applicationService.find.mockReturnValue(throwError(() => ({ status: 404 })));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="consentNotAgreed"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="consentAgreed"]')).toBeNull();
  });

  it('should render the not-consented sentence when the application exists but consent was not given', () => {
    applicationService.find.mockReturnValue(of({ ...storedApplication, agreed: false, agreedDate: null }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="consentNotAgreed"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="consentAgreed"]')).toBeNull();
  });

  it('should render the error state — not "not consented" — when the application read fails', () => {
    applicationService.find.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="consentLoadError"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="consentNotAgreed"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="consentAgreed"]')).toBeNull();
  });

  it('should fetch each document’s bytes silently and render an object URL per image row', () => {
    fixture.detectChanges();

    expect(personalDocumentService.content).toHaveBeenCalledTimes(2);
    expect(personalDocumentService.content).toHaveBeenCalledWith('doc-1', { silent: true });
    expect(personalDocumentService.content).toHaveBeenCalledWith('doc-2', { silent: true });
    expect(createObjectURL).toHaveBeenCalledTimes(2);

    const previews = fixture.nativeElement.querySelectorAll('[data-cy="documentPreview"]') as NodeListOf<HTMLImageElement>;
    expect(previews).toHaveLength(2);
    expect(Array.from(previews).map(image => image.getAttribute('src'))).toEqual(['blob:preview-1', 'blob:preview-2']);
  });

  it('should render the placeholder — and create no object URL — for a document that is not an image', () => {
    personalDocumentService.content.mockImplementation((id: string) =>
      of(id === 'doc-1' ? new Blob(['x'], { type: 'image/png' }) : new Blob(['x'], { type: 'application/pdf' })),
    );
    fixture.detectChanges();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelectorAll('[data-cy="documentPreview"]')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('[data-cy="documentNoPreview"]')).toHaveLength(1);
  });

  it('should render the placeholder rather than an error when a preview read fails', () => {
    personalDocumentService.content.mockImplementation((id: string) =>
      id === 'doc-1' ? throwError(() => ({ status: 500 })) : of(new Blob(['x'], { type: 'image/png' })),
    );
    fixture.detectChanges();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelectorAll('[data-cy="documentNoPreview"]')).toHaveLength(1);
  });

  it('should revoke every object URL it created when the page is destroyed', () => {
    fixture.detectChanges();
    expect(createObjectURL).toHaveBeenCalledTimes(2);

    fixture.destroy();

    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-2');
  });

  it('should serve /account/profile — the Q2 re-point — with the detail view and its title', () => {
    expect(profileRoute.path).toBe('profile');
    expect(profileRoute.component).toBe(ProfileDetailComponent);
    expect(profileRoute.title).toBe('healthConnect.profile.detail.title');
  });
});
