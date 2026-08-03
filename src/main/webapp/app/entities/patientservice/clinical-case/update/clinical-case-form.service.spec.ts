import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../clinical-case.test-samples';

import { ClinicalCaseFormService } from './clinical-case-form.service';

describe('ClinicalCase Form Service', () => {
  let service: ClinicalCaseFormService;

  beforeEach(() => {
    service = TestBed.inject(ClinicalCaseFormService);
  });

  describe('Service methods', () => {
    describe('createClinicalCaseFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createClinicalCaseFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            patientId: expect.any(Object),
            openedAt: expect.any(Object),
            brief: expect.any(Object),
            status: expect.any(Object),
            symptoms: expect.any(Object),
            diagnosis: expect.any(Object),
            assignedProfessionalId: expect.any(Object),
            assignedRosterId: expect.any(Object),
            recommendations: expect.any(Object),
          }),
        );
      });

      it('passing IClinicalCase should create a new form with FormGroup', () => {
        const formGroup = service.createClinicalCaseFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            patientId: expect.any(Object),
            openedAt: expect.any(Object),
            brief: expect.any(Object),
            status: expect.any(Object),
            symptoms: expect.any(Object),
            diagnosis: expect.any(Object),
            assignedProfessionalId: expect.any(Object),
            assignedRosterId: expect.any(Object),
            recommendations: expect.any(Object),
          }),
        );
      });
    });

    describe('getClinicalCase', () => {
      it('should return NewClinicalCase for default ClinicalCase initial value', () => {
        const formGroup = service.createClinicalCaseFormGroup(sampleWithNewData);

        const clinicalCase = service.getClinicalCase(formGroup);

        expect(clinicalCase).toMatchObject(sampleWithNewData);
      });

      it('should return NewClinicalCase for empty ClinicalCase initial value', () => {
        const formGroup = service.createClinicalCaseFormGroup();

        const clinicalCase = service.getClinicalCase(formGroup);

        expect(clinicalCase).toMatchObject({});
      });

      it('should return IClinicalCase', () => {
        const formGroup = service.createClinicalCaseFormGroup(sampleWithRequiredData);

        const clinicalCase = service.getClinicalCase(formGroup);

        expect(clinicalCase).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IClinicalCase should not enable id FormControl', () => {
        const formGroup = service.createClinicalCaseFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewClinicalCase should disable id FormControl', () => {
        const formGroup = service.createClinicalCaseFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
