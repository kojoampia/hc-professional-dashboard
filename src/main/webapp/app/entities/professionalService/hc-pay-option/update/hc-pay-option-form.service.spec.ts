import { TestBed } from '@angular/core/testing';

import { sampleWithRequiredData, sampleWithNewData } from '../hc-pay-option.test-samples';

import { HCPayOptionFormService } from './hc-pay-option-form.service';

describe('HCPayOption Form Service', () => {
  let service: HCPayOptionFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HCPayOptionFormService);
  });

  describe('Service methods', () => {
    describe('createHCPayOptionFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createHCPayOptionFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            type: expect.any(Object),
            userID: expect.any(Object),
            metadata: expect.any(Object),
          }),
        );
      });

      it('passing IHCPayOption should create a new form with FormGroup', () => {
        const formGroup = service.createHCPayOptionFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            type: expect.any(Object),
            userID: expect.any(Object),
            metadata: expect.any(Object),
          }),
        );
      });
    });

    describe('getHCPayOption', () => {
      it('should return NewHCPayOption for default HCPayOption initial value', () => {
        const formGroup = service.createHCPayOptionFormGroup(sampleWithNewData);

        const hCPayOption = service.getHCPayOption(formGroup) as any;

        expect(hCPayOption).toMatchObject(sampleWithNewData);
      });

      it('should return NewHCPayOption for empty HCPayOption initial value', () => {
        const formGroup = service.createHCPayOptionFormGroup();

        const hCPayOption = service.getHCPayOption(formGroup) as any;

        expect(hCPayOption).toMatchObject({});
      });

      it('should return IHCPayOption', () => {
        const formGroup = service.createHCPayOptionFormGroup(sampleWithRequiredData);

        const hCPayOption = service.getHCPayOption(formGroup) as any;

        expect(hCPayOption).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IHCPayOption should not enable id FormControl', () => {
        const formGroup = service.createHCPayOptionFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewHCPayOption should disable id FormControl', () => {
        const formGroup = service.createHCPayOptionFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
