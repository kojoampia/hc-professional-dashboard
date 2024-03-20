import { TestBed } from '@angular/core/testing';

import { sampleWithRequiredData, sampleWithNewData } from '../medication.test-samples';

import { MedicationFormService } from './medication-form.service';

describe('Medication Form Service', () => {
  let service: MedicationFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MedicationFormService);
  });

  describe('Service methods', () => {
    describe('createMedicationFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createMedicationFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            description: expect.any(Object),
            prescription: expect.any(Object),
            createdDate: expect.any(Object),
            modifiedDate: expect.any(Object),
            createdBy: expect.any(Object),
            modifiedBy: expect.any(Object),
          }),
        );
      });

      it('passing IMedication should create a new form with FormGroup', () => {
        const formGroup = service.createMedicationFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            description: expect.any(Object),
            prescription: expect.any(Object),
            createdDate: expect.any(Object),
            modifiedDate: expect.any(Object),
            createdBy: expect.any(Object),
            modifiedBy: expect.any(Object),
          }),
        );
      });
    });

    describe('getMedication', () => {
      it('should return NewMedication for default Medication initial value', () => {
        const formGroup = service.createMedicationFormGroup(sampleWithNewData);

        const medication = service.getMedication(formGroup) as any;

        expect(medication).toMatchObject(sampleWithNewData);
      });

      it('should return NewMedication for empty Medication initial value', () => {
        const formGroup = service.createMedicationFormGroup();

        const medication = service.getMedication(formGroup) as any;

        expect(medication).toMatchObject({});
      });

      it('should return IMedication', () => {
        const formGroup = service.createMedicationFormGroup(sampleWithRequiredData);

        const medication = service.getMedication(formGroup) as any;

        expect(medication).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IMedication should not enable id FormControl', () => {
        const formGroup = service.createMedicationFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewMedication should disable id FormControl', () => {
        const formGroup = service.createMedicationFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
