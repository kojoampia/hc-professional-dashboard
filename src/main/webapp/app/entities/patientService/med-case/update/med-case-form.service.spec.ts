import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../med-case.test-samples';

import { MedCaseFormService } from './med-case-form.service';

describe('MedCase Form Service', () => {
  let service: MedCaseFormService;

  beforeEach(() => {
    service = TestBed.inject(MedCaseFormService);
  });

  describe('Service methods', () => {
    describe('createMedCaseFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createMedCaseFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            symptoms: expect.any(Object),
            diagnoses: expect.any(Object),
            recommendations: expect.any(Object),
            createdDate: expect.any(Object),
            createdBy: expect.any(Object),
            modifiedDate: expect.any(Object),
            modifiedBy: expect.any(Object),
          }),
        );
      });

      it('passing IMedCase should create a new form with FormGroup', () => {
        const formGroup = service.createMedCaseFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            symptoms: expect.any(Object),
            diagnoses: expect.any(Object),
            recommendations: expect.any(Object),
            createdDate: expect.any(Object),
            createdBy: expect.any(Object),
            modifiedDate: expect.any(Object),
            modifiedBy: expect.any(Object),
          }),
        );
      });
    });

    describe('getMedCase', () => {
      it('should return NewMedCase for default MedCase initial value', () => {
        const formGroup = service.createMedCaseFormGroup(sampleWithNewData);

        const medCase = service.getMedCase(formGroup);

        expect(medCase).toMatchObject(sampleWithNewData);
      });

      it('should return NewMedCase for empty MedCase initial value', () => {
        const formGroup = service.createMedCaseFormGroup();

        const medCase = service.getMedCase(formGroup);

        expect(medCase).toMatchObject({});
      });

      it('should return IMedCase', () => {
        const formGroup = service.createMedCaseFormGroup(sampleWithRequiredData);

        const medCase = service.getMedCase(formGroup);

        expect(medCase).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IMedCase should not enable id FormControl', () => {
        const formGroup = service.createMedCaseFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewMedCase should disable id FormControl', () => {
        const formGroup = service.createMedCaseFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
