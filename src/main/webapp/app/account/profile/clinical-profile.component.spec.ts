import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { last, of, throwError } from 'rxjs';
import { Validators } from '@angular/forms';

import { AlertService } from 'app/core/util/alert.service';
import { OnboardingApiService, OnboardingProfileDto } from 'app/health-connect/api/onboarding-api.service';
import { PersonalDocumentType } from 'app/entities/personal-document/types.enum';
import { Sex } from 'app/entities/profile/sex.enum';
import { PROFILE_FIELDS_FROM_THE_ACCOUNT, PROFILE_FIELDS_WITH_NO_INPUT, REQUIRED_CONTROLS } from 'app/onboarding/profile-requirements';

import ClinicalProfileComponent from './clinical-profile.component';
import { AccountService } from '../../core/auth/account.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

/**
 * The step-2 fixture, at module scope so both describes below share ONE definition — the
 * signal-level suite and the rendered one must not drift apart about what a complete profile is.
 */
const stored: OnboardingProfileDto = {
  id: 'prof-1',
  accountId: 'doctor',
  firstName: 'Professional',
  middleNames: 'Kwame',
  lastName: 'Doctor',
  email: 'doctor@localhost',
  title: 'Dr',
  birthDate: '1985-04-02',
  // ⚠ This fixture read `sex: 'female'` and `cardType: 'GHANACARD'` as bare strings until F9 typed
  // both fields, and the lower-case one is the shape the quality database actually held — one row,
  // normalised by `ProfileEnumValueMigration`. `'female'` is now a compile error, which is the
  // whole point of the enums: the field was free text on both sides and `{"sex":"banana"}` stored
  // and answered 200.
  sex: Sex.FEMALE,
  mobilePhone: '+233200000000',
  cardType: PersonalDocumentType.GHANACARD,
  cardNumber: 'GHA-123',
  // ⚠ Complete, including `digitalAddress`, `town` and `district`, which this fixture omitted until
  // row 230 unit B. They carried no validator because the server's *advisory* meter predicate calls
  // them optional; `profile.md` says every field in the model is required and the submit gate agrees,
  // so the form now requires them and a partial address is correctly refused.
  address: {
    digitalAddress: 'GA-123-4567',
    streetAddress: '1 Old Road',
    town: 'Osu',
    city: 'Accra',
    district: 'Ayawaso East',
    region: 'Greater Accra',
    country: 'Ghana',
  },
  emergencyContact: { name: 'Ama', relationship: 'Sister', phone: '+233200000001' },
};

describe('Clinical Profile Component', () => {
  let comp: ClinicalProfileComponent;
  let fixture: ComponentFixture<ClinicalProfileComponent>;
  let api: { getOwnProfile: jest.Mock; upsertProfile: jest.Mock };
  let alertService: { showToast: jest.Mock };

  const build = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ClinicalProfileComponent, TranslateModule.forRoot()],
      providers: [
        { provide: OnboardingApiService, useValue: api },
        { provide: AlertService, useValue: alertService },
        AccountService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
      .overrideTemplate(ClinicalProfileComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(ClinicalProfileComponent);
    comp = fixture.componentInstance;
  };

  beforeEach(async () => {
    api = {
      getOwnProfile: jest.fn().mockReturnValue(of({ ...stored })),
      upsertProfile: jest.fn().mockImplementation(profile => of(profile)),
    };
    alertService = { showToast: jest.fn() };
    await build();
  });

  it('should fill the form from the stored profile, flattening address and next of kin', () => {
    comp.ngOnInit();

    expect(comp.loadState()).toBe('ready');
    expect(comp.form.getRawValue()).toEqual(
      expect.objectContaining({
        title: 'Dr',
        birthDate: '1985-04-02',
        sex: Sex.FEMALE,
        cardNumber: 'GHA-123',
        streetAddress: '1 Old Road',
        city: 'Accra',
        name: 'Ama',
        relationship: 'Sister',
      }),
    );
  });

  /**
   * THE test for this component. Name, middle names and email are not on this form by design — the
   * account section owns them — but `upsertProfile` replaces the whole document. Building the
   * payload from the form alone would blank the name the credentialing record is filed under, and
   * the screen would look like it saved correctly while doing it.
   */
  it('should preserve the fields it does not show when saving', () => {
    comp.ngOnInit();
    comp.form.patchValue({ city: 'Kumasi' });

    comp.save();

    const sent = api.upsertProfile.mock.calls[0][0] as OnboardingProfileDto;
    expect(sent.firstName).toBe('Professional');
    expect(sent.middleNames).toBe('Kwame');
    expect(sent.lastName).toBe('Doctor');
    expect(sent.email).toBe('doctor@localhost');
    expect(sent.id).toBe('prof-1');
    expect(sent.accountId).toBe('doctor');
    expect(sent.address?.city).toBe('Kumasi');
  });

  it('should confirm a successful save', () => {
    comp.ngOnInit();

    comp.save();

    expect(alertService.showToast).toHaveBeenCalledWith('healthConnect.profile.clinical.saved');
    expect(comp.saving()).toBe(false);
  });

  it('should refuse to save an incomplete profile rather than send it', () => {
    comp.ngOnInit();
    comp.form.patchValue({ mobilePhone: '' });

    comp.save();

    expect(api.upsertProfile).not.toHaveBeenCalled();
    expect(comp.form.get('mobilePhone')!.touched).toBe(true);
  });

  /**
   * An account can exist before a profile does — admin invitation creates the login, and the
   * clinician fills this in afterwards. That is an empty form, not a failure.
   */
  it('should treat a missing profile as an empty form', () => {
    api.getOwnProfile.mockReturnValue(throwError(() => ({ status: 404 })));

    comp.ngOnInit();

    expect(comp.loadState()).toBe('ready');
    expect(comp.form.getRawValue().cardNumber).toBe('');
  });

  it('should surface a real load failure as an error', () => {
    api.getOwnProfile.mockReturnValue(throwError(() => ({ status: 500 })));

    comp.ngOnInit();

    expect(comp.loadState()).toBe('error');
  });

  it('should stop showing a spinner when the save fails', () => {
    comp.ngOnInit();
    api.upsertProfile.mockReturnValue(throwError(() => ({ status: 500 })));

    comp.save();

    expect(comp.saving()).toBe(false);
  });

  /**
   * ⭐ **The derivation guard — `backlog.md` row 230, unit B.**
   *
   * <p>Row 230 has the form validate every requirement client-side, and the standing hazard in doing
   * that is a **seventh hand-written copy of a server invariant**: a list that agrees with the model
   * today and quietly stops. So the form applies `Validators.required` from
   * `onboarding/profile-requirements.ts` and from nothing else, and this asserts the two match **in
   * both directions**.
   *
   * <p>⚠ **Both directions, because each catches a different mistake.** A control losing its validator
   * fails this assertion one way; a field added to the partition and given no control fails at
   * construction, because `requireEvery` throws rather than skipping it. The third link in the chain is
   * `profile-requirements.ts`'s own compile-time proof against the DTO, so a field added to
   * `OnboardingProfileDto` reddens `npx ng build` before it ever reaches this spec.
   */
  it('should require exactly the controls profile-requirements.ts derives, and no others', () => {
    const derived = REQUIRED_CONTROLS.map(control => control.field).sort();

    const actuallyRequired = Object.keys(comp.form.controls)
      .filter(name => comp.form.get(name)!.hasValidator(Validators.required))
      .sort();

    expect(actuallyRequired).toEqual(derived);
  });

  /**
   * ⛔ The one asymmetry, asserted so that it stays deliberate: the account-owned fields and
   * `middleNames` must **not** be required, because this form has no input for any of them. Requiring
   * one would leave the form permanently invalid behind a disabled Save with nothing on screen to fix.
   */
  it('should not require fields this form has no input for', () => {
    for (const field of [...PROFILE_FIELDS_FROM_THE_ACCOUNT, ...PROFILE_FIELDS_WITH_NO_INPUT]) {
      expect(comp.form.get(field)!.hasValidator(Validators.required)).toBe(false);
    }
  });

  /**
   * ⭐ **The gap list is what row 230 bought with the coarse wire** — the applicant sees which
   * requirements remain *before anything reaches the server*.
   *
   * <p>Named in the server's own three-key grouping, which `ProfileCompleteness.missingRequirements`
   * explicitly delegates: *"Which of the eleven values inside a contact is missing is the form's to
   * show, not the refusal's."*
   */
  it('should name the outstanding requirement as the applicant empties a field', () => {
    comp.ngOnInit();
    expect(comp.outstandingRequirements()).toEqual([]);

    comp.form.patchValue({ city: '' });
    expect(comp.outstandingRequirements()).toEqual(['address']);

    comp.form.patchValue({ mobilePhone: '' });
    expect(comp.outstandingRequirements()).toEqual(['profile', 'address']);

    comp.form.patchValue({ phone: '' });
    expect(comp.outstandingRequirements()).toEqual(['profile', 'address', 'nextOfKin']);
  });

  /** A whitespace-only value is what an untouched input posts — counting it would make the gap list lie. */
  it('should treat a blank string as not provided', () => {
    comp.ngOnInit();

    comp.form.patchValue({ cardNumber: '   ' });

    expect(comp.outstandingRequirements()).toEqual(['profile']);
  });

  /** Nothing to complain about until the applicant has touched the form. */
  it('should stay quiet about gaps before the form is edited', () => {
    api.getOwnProfile.mockReturnValue(throwError(() => ({ status: 404 })));
    comp.ngOnInit();

    expect(comp.showGaps()).toBe(false);

    comp.form.patchValue({ city: 'Accra' });

    expect(comp.showGaps()).toBe(true);
  });
});

/**
 * ⭐ **The gap panel, rendered** — added after review, for the reason the meter's rendered block gives:
 * the suite above overrides the template to `''`, so it proves the `outstandingRequirements` computed
 * and says nothing about whether the panel exists, is bound to it, or translates its chips.
 *
 * <p>Loads the shipped English catalogue so a lost `jhiTranslate` or a key the catalogue lacks renders
 * as the key itself and fails here, which is what ngx-translate does in production too.
 */
describe('Clinical Profile Component — the rendered gap panel', () => {
  let fixture: ComponentFixture<ClinicalProfileComponent>;
  let comp: ClinicalProfileComponent;
  let api: { getOwnProfile: jest.Mock; upsertProfile: jest.Mock };

  const english = JSON.parse(readFileSync(resolve(__dirname, '../../../i18n/en/healthConnect.json'), 'utf8')) as Record<string, unknown>;
  const completion = (english as { healthConnect: { profile: { completion: Record<string, any> } } }).healthConnect.profile.completion;

  const panel = (): HTMLElement | null => fixture.nativeElement.querySelector('[data-cy="clinicalGaps"]');

  beforeEach(async () => {
    api = {
      getOwnProfile: jest.fn().mockReturnValue(of({ ...stored })),
      upsertProfile: jest.fn().mockImplementation(profile => of(profile)),
    };

    await TestBed.configureTestingModule({
      imports: [ClinicalProfileComponent, TranslateModule.forRoot()],
      providers: [
        { provide: OnboardingApiService, useValue: api },
        { provide: AlertService, useValue: { showToast: jest.fn() } },
        AccountService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', english);
    translate.use('en');

    fixture = TestBed.createComponent(ClinicalProfileComponent);
    comp = fixture.componentInstance;
  });

  /**
   * ⛔ **Quiet on arrival, with a COMPLETE stored profile loaded** — which is the path the signal-level
   * guard could not reach, because it stubbed the read to 404 and `prefill` never ran.
   */
  it('should render no gap panel when a stored profile has just loaded', () => {
    fixture.detectChanges();

    expect(comp.loadState()).toBe('ready');
    expect(panel()).toBeNull();
  });

  /** And still nothing on arrival when the stored profile is INCOMPLETE — the load is not an edit. */
  it('should render no gap panel on arrival even if the stored profile is incomplete', () => {
    api.getOwnProfile.mockReturnValue(of({ ...stored, address: { ...stored.address, city: '' } }));

    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('should render a translated chip per outstanding requirement once the applicant edits', () => {
    fixture.detectChanges();

    comp.form.patchValue({ city: '', phone: '' });
    fixture.detectChanges();

    expect(panel()).not.toBeNull();
    expect(panel()!.textContent).toContain(completion.gaps.title);
    expect(fixture.nativeElement.querySelector('[data-cy="gap-address"]')!.textContent.trim()).toBe(completion.requirements.address);
    expect(fixture.nativeElement.querySelector('[data-cy="gap-nextOfKin"]')!.textContent.trim()).toBe(completion.requirements.nextOfKin);
    // Only the outstanding ones get a chip.
    expect(fixture.nativeElement.querySelector('[data-cy="gap-profile"]')).toBeNull();
  });

  /** ⛔ No raw keys on screen — ngx-translate prints a missing key rather than failing. */
  it('should render no raw translation keys in the gap panel', () => {
    fixture.detectChanges();
    comp.form.patchValue({ city: '' });
    fixture.detectChanges();

    expect(panel()!.textContent).not.toContain('healthConnect.');
  });

  /**
   * A refused save shows the gaps even when nothing was typed — which is what someone who believes
   * they have finished actually does.
   */
  it('should render the gap panel after a save is refused without any edit', () => {
    api.getOwnProfile.mockReturnValue(of({ ...stored, mobilePhone: '' }));
    fixture.detectChanges();
    expect(panel()).toBeNull();

    comp.save();
    fixture.detectChanges();

    expect(api.upsertProfile).not.toHaveBeenCalled();
    expect(panel()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="gap-profile"]')).not.toBeNull();
  });
});
