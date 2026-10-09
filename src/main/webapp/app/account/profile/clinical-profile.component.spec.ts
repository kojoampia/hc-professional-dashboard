import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { last, of, throwError } from 'rxjs';

import { AlertService } from 'app/core/util/alert.service';
import { OnboardingApiService, OnboardingProfileDto } from 'app/health-connect/api/onboarding-api.service';
import { PersonalDocumentType } from 'app/entities/personal-document/types.enum';
import { Sex } from 'app/entities/profile/sex.enum';

import ClinicalProfileComponent from './clinical-profile.component';
import { AccountService } from '../../core/auth/account.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('Clinical Profile Component', () => {
  let comp: ClinicalProfileComponent;
  let fixture: ComponentFixture<ClinicalProfileComponent>;
  let api: { getOwnProfile: jest.Mock; upsertProfile: jest.Mock };
  let alertService: { showToast: jest.Mock };

  /** A profile whose identity fields this form never shows — precisely what must survive a save. */
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
    address: { streetAddress: '1 Old Road', city: 'Accra', region: 'Greater Accra', country: 'Ghana' },
    emergencyContact: { name: 'Ama', relationship: 'Sister', phone: '+233200000001' },
  };

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
        contactName: 'Ama',
        contactRelationship: 'Sister',
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
});
