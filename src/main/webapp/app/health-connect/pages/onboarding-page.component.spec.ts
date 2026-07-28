import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AlertService } from 'app/core/util/alert.service';
import { OnboardingApiService, OnboardingApplicationDto } from '../api/onboarding-api.service';
import OnboardingPageComponent from './onboarding-page.component';

describe('OnboardingPageComponent', () => {
  let fixture: ComponentFixture<OnboardingPageComponent>;
  let component: OnboardingPageComponent;
  let api: Record<
    | 'getOwnApplication'
    | 'getOwnProfile'
    | 'listDocuments'
    | 'events'
    | 'startApplication'
    | 'upsertProfile'
    | 'completeProfile'
    | 'submit'
    | 'uploadDocument',
    jest.Mock
  >;

  const application = (
    status: OnboardingApplicationDto['status'],
    extra: Partial<OnboardingApplicationDto> = {},
  ): OnboardingApplicationDto => ({
    id: 'app-1',
    accountId: 'me',
    status,
    ...extra,
  });

  const configure = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [OnboardingPageComponent, TranslateModule.forRoot()],
      providers: [{ provide: OnboardingApiService, useValue: api as unknown as OnboardingApiService }],
    }).compileComponents();
    fixture = TestBed.createComponent(OnboardingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    api = {
      getOwnApplication: jest.fn(),
      getOwnProfile: jest.fn(() => throwError(() => ({ status: 404 }))),
      listDocuments: jest.fn(() => of([])),
      events: jest.fn(() => of([])),
      startApplication: jest.fn(),
      upsertProfile: jest.fn(() => of({})),
      completeProfile: jest.fn(),
      submit: jest.fn(),
      uploadDocument: jest.fn(),
    };
  });

  describe('status-driven step routing (WP4 gate)', () => {
    it('opens the consent step when no application exists yet', async () => {
      api.getOwnApplication.mockReturnValue(throwError(() => ({ status: 404 })));
      await configure();
      expect(component.activeStep()).toBe('consent');
      expect(fixture.nativeElement.querySelector('[data-cy="consentStep"]')).toBeTruthy();
    });

    it.each([
      ['APPLICATION_STARTED', 'profile'],
      ['PROFILE_COMPLETED', 'documents'],
      ['RETURNED_FOR_CORRECTION', 'review'],
      ['CREDENTIAL_REVIEW', 'status'],
      ['APPROVED', 'status'],
      ['ACTIVE', 'status'],
      ['REJECTED', 'status'],
    ] as const)('maps %s to the %s step', async (status, expectedStep) => {
      api.getOwnApplication.mockReturnValue(of(application(status)));
      await configure();
      expect(component.activeStep()).toBe(expectedStep);
    });

    it('shows the reviewer correction notes and keeps steps editable on correction', async () => {
      api.getOwnApplication.mockReturnValue(of(application('RETURNED_FOR_CORRECTION', { correctionNotes: 'License is expired' })));
      await configure();
      const banner = fixture.nativeElement.querySelector('[data-cy="correctionBanner"]');
      expect(banner.textContent).toContain('License is expired');
      expect(component.editable()).toBe(true);
    });

    it('locks the wizard steps once the application is in review', async () => {
      api.getOwnApplication.mockReturnValue(of(application('CREDENTIAL_REVIEW')));
      await configure();
      expect(component.editable()).toBe(false);
      component.goTo('profile');
      expect(component.activeStep()).toBe('status');
    });
  });

  describe('consent step', () => {
    beforeEach(async () => {
      api.getOwnApplication.mockReturnValue(throwError(() => ({ status: 404 })));
      await configure();
    });

    it('requires the consent checkbox before starting', () => {
      component.consentForm.patchValue({ requestedRole: 'ROLE_NURSE', consentAccepted: false });
      component.start();
      expect(api.startApplication).not.toHaveBeenCalled();
    });

    it('starts the application with the selected role and advances to profile', () => {
      api.startApplication.mockReturnValue(of(application('APPLICATION_STARTED', { requestedRole: 'ROLE_PHARMACIST' })));
      component.consentForm.patchValue({ requestedRole: 'ROLE_PHARMACIST', consentAccepted: true });
      component.start();
      expect(api.startApplication).toHaveBeenCalledWith('ROLE_PHARMACIST');
      expect(component.activeStep()).toBe('profile');
    });
  });

  describe('profile and contact steps', () => {
    beforeEach(async () => {
      api.getOwnApplication.mockReturnValue(of(application('APPLICATION_STARTED')));
      await configure();
    });

    const fillProfile = (): void => {
      component.profileForm.patchValue({
        firstName: 'Ama',
        lastName: 'Serwaa',
        birthDate: '1990-04-01',
        sex: 'female',
        mobilePhone: '0242000000',
        email: 'ama@example.com',
        cardType: 'GHANACARD',
        cardNumber: 'GHA-123',
      });
    };

    it('does not persist an invalid profile form', () => {
      component.saveProfileStep();
      expect(api.upsertProfile).not.toHaveBeenCalled();
    });

    it('persists the profile and advances to the contact step', () => {
      fillProfile();
      component.saveProfileStep();
      expect(api.upsertProfile).toHaveBeenCalled();
      expect(component.activeStep()).toBe('contact');
    });

    it('fires the complete-profile transition when the contact step is saved', () => {
      api.completeProfile.mockReturnValue(of(application('PROFILE_COMPLETED')));
      fillProfile();
      component.contactForm.patchValue({
        streetAddress: '12 Ridge Rd',
        city: 'Accra',
        region: 'Greater Accra',
        country: 'Ghana',
        contactName: 'Kojo A',
        contactRelationship: 'spouse',
        contactPhone: '0500000000',
      });
      component.saveContactStep();
      expect(api.upsertProfile).toHaveBeenCalled();
      expect(api.completeProfile).toHaveBeenCalled();
      expect(component.application()?.status).toBe('PROFILE_COMPLETED');
      expect(component.activeStep()).toBe('documents');
    });
  });

  describe('documents and submission', () => {
    beforeEach(async () => {
      api.getOwnApplication.mockReturnValue(of(application('PROFILE_COMPLETED')));
      api.listDocuments.mockReturnValue(
        of([
          { id: '1', type: 'CERTIFICATE' },
          { id: '2', type: 'LICENSE', expiryDate: '2027-01-01' },
          { id: '3', type: 'GHANACARD' },
          { id: '4', type: 'PASSPHOTO' },
        ] as never),
      );
      await configure();
    });

    it('computes the mandatory checklist from uploaded documents', () => {
      expect(component.mandatoryChecklist()).toEqual({ certificate: true, license: true, identity: true, photo: true });
      expect(component.mandatoryComplete()).toBe(true);
    });

    it('uploads with conditional metadata and refreshes the list', () => {
      api.uploadDocument.mockReturnValue(of({ id: 'new', type: 'LICENSE' } as never));
      component.uploadForm.patchValue({ type: 'LICENSE', expiryDate: '2027-06-30' });
      component.upload([new File(['%PDF'], 'l.pdf', { type: 'application/pdf' })]);
      expect(api.uploadDocument).toHaveBeenCalledWith(expect.any(File), 'LICENSE', { otherLabel: undefined, expiryDate: '2027-06-30' });
      expect(api.listDocuments).toHaveBeenCalledTimes(2);
    });

    it('submits for review and lands on the status view with a toast', () => {
      api.submit.mockReturnValue(of(application('CREDENTIAL_REVIEW')));
      const toastSpy = jest.spyOn(TestBed.inject(AlertService), 'showToast');
      component.submit();
      expect(api.submit).toHaveBeenCalled();
      expect(component.activeStep()).toBe('status');
      expect(toastSpy).toHaveBeenCalledWith('healthConnect.onboarding.toast.submitted');
    });
  });
});
