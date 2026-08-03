import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../medication-record.test-samples';

import { MedicationRecordFormService } from './medication-record-form.service';

describe('MedicationRecord Form Service', () => {
  let service: MedicationRecordFormService;

  beforeEach(() => {
    service = TestBed.inject(MedicationRecordFormService);
  });

  describe('Service methods', () => {
    describe('createMedicationRecordFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createMedicationRecordFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            patientId: expect.any(Object),
            occurredAt: expect.any(Object),
            label: expect.any(Object),
          }),
        );
      });

      it('passing IMedicationRecord should create a new form with FormGroup', () => {
        const formGroup = service.createMedicationRecordFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            patientId: expect.any(Object),
            occurredAt: expect.any(Object),
            label: expect.any(Object),
          }),
        );
      });
    });

    describe('getMedicationRecord', () => {
      it('should return NewMedicationRecord for default MedicationRecord initial value', () => {
        const formGroup = service.createMedicationRecordFormGroup(sampleWithNewData);

        const medicationRecord = service.getMedicationRecord(formGroup);

        expect(medicationRecord).toMatchObject(sampleWithNewData);
      });

      it('should return NewMedicationRecord for empty MedicationRecord initial value', () => {
        const formGroup = service.createMedicationRecordFormGroup();

        const medicationRecord = service.getMedicationRecord(formGroup);

        expect(medicationRecord).toMatchObject({});
      });

      it('should return IMedicationRecord', () => {
        const formGroup = service.createMedicationRecordFormGroup(sampleWithRequiredData);

        const medicationRecord = service.getMedicationRecord(formGroup);

        expect(medicationRecord).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IMedicationRecord should not enable id FormControl', () => {
        const formGroup = service.createMedicationRecordFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewMedicationRecord should disable id FormControl', () => {
        const formGroup = service.createMedicationRecordFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
