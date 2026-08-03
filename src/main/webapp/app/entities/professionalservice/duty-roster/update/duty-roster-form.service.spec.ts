import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../duty-roster.test-samples';

import { DutyRosterFormService } from './duty-roster-form.service';

describe('DutyRoster Form Service', () => {
  let service: DutyRosterFormService;

  beforeEach(() => {
    service = TestBed.inject(DutyRosterFormService);
  });

  describe('Service methods', () => {
    describe('createDutyRosterFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createDutyRosterFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            subscribedProfessionals: expect.any(Object),
          }),
        );
      });

      it('passing IDutyRoster should create a new form with FormGroup', () => {
        const formGroup = service.createDutyRosterFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            subscribedProfessionals: expect.any(Object),
          }),
        );
      });
    });

    describe('getDutyRoster', () => {
      it('should return NewDutyRoster for default DutyRoster initial value', () => {
        const formGroup = service.createDutyRosterFormGroup(sampleWithNewData);

        const dutyRoster = service.getDutyRoster(formGroup);

        expect(dutyRoster).toMatchObject(sampleWithNewData);
      });

      it('should return NewDutyRoster for empty DutyRoster initial value', () => {
        const formGroup = service.createDutyRosterFormGroup();

        const dutyRoster = service.getDutyRoster(formGroup);

        expect(dutyRoster).toMatchObject({});
      });

      it('should return IDutyRoster', () => {
        const formGroup = service.createDutyRosterFormGroup(sampleWithRequiredData);

        const dutyRoster = service.getDutyRoster(formGroup);

        expect(dutyRoster).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IDutyRoster should not enable id FormControl', () => {
        const formGroup = service.createDutyRosterFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewDutyRoster should disable id FormControl', () => {
        const formGroup = service.createDutyRosterFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
