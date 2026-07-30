import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../duty-shift.test-samples';

import { DutyShiftFormService } from './duty-shift-form.service';

describe('DutyShift Form Service', () => {
  let service: DutyShiftFormService;

  beforeEach(() => {
    service = TestBed.inject(DutyShiftFormService);
  });

  describe('Service methods', () => {
    describe('createDutyShiftFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createDutyShiftFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            professionalId: expect.any(Object),
            startsAt: expect.any(Object),
            endsAt: expect.any(Object),
            status: expect.any(Object),
            roster: expect.any(Object),
          }),
        );
      });

      it('passing IDutyShift should create a new form with FormGroup', () => {
        const formGroup = service.createDutyShiftFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            professionalId: expect.any(Object),
            startsAt: expect.any(Object),
            endsAt: expect.any(Object),
            status: expect.any(Object),
            roster: expect.any(Object),
          }),
        );
      });
    });

    describe('getDutyShift', () => {
      it('should return NewDutyShift for default DutyShift initial value', () => {
        const formGroup = service.createDutyShiftFormGroup(sampleWithNewData);

        const dutyShift = service.getDutyShift(formGroup);

        expect(dutyShift).toMatchObject(sampleWithNewData);
      });

      it('should return NewDutyShift for empty DutyShift initial value', () => {
        const formGroup = service.createDutyShiftFormGroup();

        const dutyShift = service.getDutyShift(formGroup);

        expect(dutyShift).toMatchObject({});
      });

      it('should return IDutyShift', () => {
        const formGroup = service.createDutyShiftFormGroup(sampleWithRequiredData);

        const dutyShift = service.getDutyShift(formGroup);

        expect(dutyShift).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IDutyShift should not enable id FormControl', () => {
        const formGroup = service.createDutyShiftFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewDutyShift should disable id FormControl', () => {
        const formGroup = service.createDutyShiftFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
