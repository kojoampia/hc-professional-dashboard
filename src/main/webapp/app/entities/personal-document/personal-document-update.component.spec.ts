import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { of, throwError } from 'rxjs';

import { LANGUAGES } from 'app/config/language.constants';
import { AlertService } from 'app/core/util/alert.service';
import { OnboardingApiService, OnboardingProgressDto } from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { ProfileService } from 'app/entities/profile/service';
import { WIZARD_PROFILE_STORAGE_KEY } from 'app/onboarding/wizard.service';

import PersonalDocumentUpdateComponent from './personal-document-update.component';

const progress = (done: string[] = []): OnboardingProgressDto => ({
  percent: 0,
  complete: false,
  status: 'APPLICATION_STARTED',
  requirements: [
    { key: 'certificate', done: done.includes('certificate') },
    { key: 'license', done: done.includes('license') },
    { key: 'identity', done: done.includes('identity') },
    { key: 'photo', done: done.includes('photo') },
    // Not step 3's, and must not be counted by it.
    { key: 'consent', done: true },
  ],
  steps: { account: true, profile: true, documents: false, consent: false },
});

describe('Personal Document Update Component — step 3', () => {
  let comp: PersonalDocumentUpdateComponent;
  let fixture: ComponentFixture<PersonalDocumentUpdateComponent>;
  let api: { listDocuments: jest.Mock; uploadDocument: jest.Mock };
  let profileService: { find: jest.Mock };
  let progressService: { load: jest.Mock; refresh: jest.Mock; progress: jest.Mock };
  let alertService: { showToast: jest.Mock };

  const build = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [PersonalDocumentUpdateComponent, TranslateModule.forRoot()],
      providers: [
        { provide: OnboardingApiService, useValue: api },
        { provide: ProfileService, useValue: profileService },
        { provide: OnboardingProgressService, useValue: progressService },
        { provide: AlertService, useValue: alertService },
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
      .overrideTemplate(PersonalDocumentUpdateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(PersonalDocumentUpdateComponent);
    comp = fixture.componentInstance;
  };

  beforeEach(async () => {
    sessionStorage.clear();
    api = {
      listDocuments: jest.fn().mockReturnValue(of([])),
      uploadDocument: jest.fn().mockReturnValue(of({ id: 'd-1', type: 'CERTIFICATE' })),
    };
    profileService = { find: jest.fn().mockReturnValue(of({ id: 'p-1' })) };
    progressService = { load: jest.fn(), refresh: jest.fn(), progress: jest.fn().mockReturnValue(progress()) };
    alertService = { showToast: jest.fn() };
    await build();
  });

  /** `profile.md:206` — *"reading the profile from session storage"*, and step 2 put it there. */
  it('should read the profile from session storage without asking the server', () => {
    sessionStorage.setItem(WIZARD_PROFILE_STORAGE_KEY, JSON.stringify({ id: 'p-stored' }));

    comp.ngOnInit();

    expect(comp.profileId()).toBe('p-stored');
    expect(profileService.find).not.toHaveBeenCalled();
  });

  /**
   * ⛔ **And it falls back to the server**, because three ordinary paths leave the store empty: a deep
   * link straight to this pane, a new tab, and private-browsing mode where step 2's `setItem` threw.
   * A pane that refused to work without the store would break on a refresh.
   */
  it('should fall back to GET /api/profile when session storage is empty', () => {
    comp.ngOnInit();

    expect(profileService.find).toHaveBeenCalled();
    expect(comp.profileId()).toBe('p-1');
  });

  it('should fall back when the stored value is unusable rather than throwing', () => {
    sessionStorage.setItem(WIZARD_PROFILE_STORAGE_KEY, 'not json');

    comp.ngOnInit();

    expect(profileService.find).toHaveBeenCalled();
  });

  /**
   * ⛔ **THE step-3 case.** `requireMandatoryDocuments` 400s a submission without a certificate, a
   * licence with an expiry, a government identity card and a passport photo — the same four for every
   * discipline — and `profile.md` never states the set. Read from the server's own requirement
   * answers, so this pane cannot tell an applicant they are finished while the service disagrees.
   */
  it('should render the four mandatory requirements from the server answer, and nothing else', () => {
    comp.ngOnInit();

    expect(comp.mandatory().map(requirement => requirement.key)).toEqual(['certificate', 'license', 'identity', 'photo']);
    expect(comp.mandatoryOutstanding()).toBe(4);
  });

  it('should count only the outstanding mandatory requirements', () => {
    progressService.progress.mockReturnValue(progress(['certificate', 'photo']));

    comp.ngOnInit();

    expect(comp.mandatoryOutstanding()).toBe(2);
  });

  /**
   * ⚠ `requireMandatoryDocuments` runs at **submit**, not per upload, so a client-side count would
   * read complete behind a Submit that 400s. The outstanding figure comes from the server and this
   * asserts nothing is recomputed: one satisfied document does not empty the list.
   */
  it('should not read as satisfied after a single upload', () => {
    comp.ngOnInit();

    comp.upload([new File([''], 'cert.pdf', { type: 'application/pdf' })]);

    expect(comp.mandatoryOutstanding()).toBe(4);
    expect(progressService.refresh).toHaveBeenCalled();
  });

  it('should upload with the chosen type and refresh the list and the meter', () => {
    comp.ngOnInit();
    comp.uploadForm.patchValue({ type: 'PASSPHOTO' });

    comp.upload([new File([''], 'me.jpg', { type: 'image/jpeg' })]);

    expect(api.uploadDocument).toHaveBeenCalledWith(expect.any(File), 'PASSPHOTO', expect.any(Object));
    expect(alertService.showToast).toHaveBeenCalledWith('healthConnect.onboarding.toast.documentUploaded');
    expect(api.listDocuments).toHaveBeenCalledTimes(2);
  });

  /** Two of the server's seven 400s, caught before a request rather than after one. */
  it('should refuse a licence with no expiry date, and send nothing', () => {
    comp.ngOnInit();
    comp.uploadForm.patchValue({ type: 'LICENSE', expiryDate: '' });

    comp.upload([new File([''], 'licence.pdf', { type: 'application/pdf' })]);

    expect(api.uploadDocument).not.toHaveBeenCalled();
    expect(comp.expiryRequired).toBe(true);
  });

  it('should refuse an OTHER document with no label, and send nothing', () => {
    comp.ngOnInit();
    comp.uploadForm.patchValue({ type: 'OTHER', otherLabel: '' });

    comp.upload([new File([''], 'thing.pdf', { type: 'application/pdf' })]);

    expect(api.uploadDocument).not.toHaveBeenCalled();
    expect(comp.otherLabelRequired).toBe(true);
  });

  /**
   * ⛔ `AVATAR` is not offered, and `OnboardingDocumentType` is the nine-value union so it cannot be:
   * an avatar stored as a credential would let a selfie satisfy `REQ_PHOTO` and carry an application
   * to `CREDENTIAL_REVIEW` (`backlog.md` row 232).
   */
  it('should not offer the avatar among the uploadable types', () => {
    expect(comp.uploadableTypes).toHaveLength(9);
    expect(comp.uploadableTypes as readonly string[]).not.toContain('AVATAR');
  });

  it('should offer only the three content types the server allows', () => {
    expect(comp.acceptedTypes).toEqual(['application/pdf', 'image/png', 'image/jpeg']);
  });

  /** Naming a row is the only thing that archives it, and only a live row of the same type qualifies. */
  it('should offer only live documents of the selected type as a replacement', () => {
    api.listDocuments.mockReturnValue(
      of([
        { id: 'd-1', type: 'CERTIFICATE' },
        { id: 'd-2', type: 'CERTIFICATE', supersededAt: '2026-01-01T00:00:00Z' },
        { id: 'd-3', type: 'LICENSE' },
      ]),
    );
    comp.ngOnInit();

    expect(comp.replaceable().map(document => document.id)).toEqual(['d-1']);
    expect(comp.archived({ id: 'd-2', type: 'CERTIFICATE', supersededAt: '2026-01-01T00:00:00Z' })).toBe(true);
  });

  it('should clear the replacement choice when the type changes', () => {
    comp.ngOnInit();
    comp.uploadForm.patchValue({ supersedesDocumentId: 'd-1' });

    comp.uploadForm.controls.type.setValue('LICENSE');

    expect(comp.uploadForm.controls.supersedesDocumentId.value).toBe('');
  });

  it('should treat a 404 document list as empty rather than as a failure', () => {
    api.listDocuments.mockReturnValue(throwError(() => ({ status: 404 })));

    comp.ngOnInit();

    expect(comp.loadState()).toBe('ready');
  });

  it('should report a genuine read failure', () => {
    api.listDocuments.mockReturnValue(throwError(() => ({ status: 500 })));

    comp.ngOnInit();

    expect(comp.loadState()).toBe('error');
  });
});

/** ⭐ Rendered against the real catalogues in all four languages — see the step-1 spec for why. */
describe('Personal Document Update Component — rendered in four languages', () => {
  const catalogue = (locale: string): Record<string, unknown> =>
    JSON.parse(readFileSync(resolve(__dirname, `../../../i18n/${locale}/healthConnect.json`), 'utf8')) as Record<string, unknown>;

  const render = async (locale: string): Promise<ComponentFixture<PersonalDocumentUpdateComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PersonalDocumentUpdateComponent, TranslateModule.forRoot()],
      providers: [
        { provide: OnboardingApiService, useValue: { listDocuments: () => of([]), uploadDocument: jest.fn() } },
        { provide: ProfileService, useValue: { find: () => of({ id: 'p-1' }) } },
        {
          provide: OnboardingProgressService,
          useValue: { load: jest.fn(), refresh: jest.fn(), progress: () => progress(['certificate']) },
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

    const fixture = TestBed.createComponent(PersonalDocumentUpdateComponent);
    fixture.detectChanges();
    return fixture;
  };

  it.each(LANGUAGES)('should render step 3 in %s with no raw translation keys', async locale => {
    const fixture = await render(locale);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    const wizard = (catalogue(locale) as { healthConnect: { onboarding: { wizard: { documents: Record<string, string> } } } }).healthConnect
      .onboarding.wizard.documents;
    expect(text).toContain(wizard.title);
    expect(text).toContain(wizard.subtitle);
    expect(text).not.toContain('healthConnect.onboarding');
    expect(text).not.toContain('healthConnect.profile');
  });

  it('should render a row per mandatory requirement, each with its state in words', async () => {
    const fixture = await render('en');
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('[data-cy^="documentStepMandatory-"]')).toHaveLength(4);

    const wizard = (catalogue('en') as { healthConnect: { onboarding: { wizard: { documents: Record<string, string> } } } }).healthConnect
      .onboarding.wizard.documents;
    const certificate = element.querySelector('[data-cy="documentStepMandatory-certificate"]')!;
    const licence = element.querySelector('[data-cy="documentStepMandatory-license"]')!;
    // ⚠ The glyph is aria-hidden and the colour is unreadable to a screen reader (backlog.md row
    // 235, filed against both clients). A new surface must not ship that shape.
    expect(certificate.textContent).toContain(wizard.satisfied);
    expect(licence.textContent).toContain(wizard.notSatisfied);
  });
});
