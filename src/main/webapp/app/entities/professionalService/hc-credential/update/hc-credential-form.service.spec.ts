import { TestBed } from '@angular/core/testing';

import { sampleWithRequiredData, sampleWithNewData } from '../hc-credential.test-samples';

import { HCCredentialFormService } from './hc-credential-form.service';

describe('HCCredential Form Service', () => {
  let service: HCCredentialFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HCCredentialFormService);
  });

  describe('Service methods', () => {
    describe('createHCCredentialFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createHCCredentialFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            email: expect.any(Object),
            phoneNumber: expect.any(Object),
            password: expect.any(Object),
            role: expect.any(Object),
            createdDate: expect.any(Object),
            active: expect.any(Object),
            modifiedDate: expect.any(Object),
          }),
        );
      });

      it('passing IHCCredential should create a new form with FormGroup', () => {
        const formGroup = service.createHCCredentialFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            email: expect.any(Object),
            phoneNumber: expect.any(Object),
            password: expect.any(Object),
            role: expect.any(Object),
            createdDate: expect.any(Object),
            active: expect.any(Object),
            modifiedDate: expect.any(Object),
          }),
        );
      });
    });

    describe('getHCCredential', () => {
      it('should return NewHCCredential for default HCCredential initial value', () => {
        const formGroup = service.createHCCredentialFormGroup(sampleWithNewData);

        const hCCredential = service.getHCCredential(formGroup) as any;

        expect(hCCredential).toMatchObject(sampleWithNewData);
      });

      it('should return NewHCCredential for empty HCCredential initial value', () => {
        const formGroup = service.createHCCredentialFormGroup();

        const hCCredential = service.getHCCredential(formGroup) as any;

        expect(hCCredential).toMatchObject({});
      });

      it('should return IHCCredential', () => {
        const formGroup = service.createHCCredentialFormGroup(sampleWithRequiredData);

        const hCCredential = service.getHCCredential(formGroup) as any;

        expect(hCCredential).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IHCCredential should not enable id FormControl', () => {
        const formGroup = service.createHCCredentialFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewHCCredential should disable id FormControl', () => {
        const formGroup = service.createHCCredentialFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
