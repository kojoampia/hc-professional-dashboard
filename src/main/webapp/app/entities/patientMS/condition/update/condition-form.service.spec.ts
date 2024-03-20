import { TestBed } from '@angular/core/testing';

import { sampleWithRequiredData, sampleWithNewData } from '../condition.test-samples';

import { ConditionFormService } from './condition-form.service';

describe('Condition Form Service', () => {
  let service: ConditionFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConditionFormService);
  });

  describe('Service methods', () => {
    describe('createConditionFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createConditionFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            description: expect.any(Object),
            createdDate: expect.any(Object),
            modifiedDate: expect.any(Object),
            createdBy: expect.any(Object),
            modifiedBy: expect.any(Object),
          }),
        );
      });

      it('passing ICondition should create a new form with FormGroup', () => {
        const formGroup = service.createConditionFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            description: expect.any(Object),
            createdDate: expect.any(Object),
            modifiedDate: expect.any(Object),
            createdBy: expect.any(Object),
            modifiedBy: expect.any(Object),
          }),
        );
      });
    });

    describe('getCondition', () => {
      it('should return NewCondition for default Condition initial value', () => {
        const formGroup = service.createConditionFormGroup(sampleWithNewData);

        const condition = service.getCondition(formGroup) as any;

        expect(condition).toMatchObject(sampleWithNewData);
      });

      it('should return NewCondition for empty Condition initial value', () => {
        const formGroup = service.createConditionFormGroup();

        const condition = service.getCondition(formGroup) as any;

        expect(condition).toMatchObject({});
      });

      it('should return ICondition', () => {
        const formGroup = service.createConditionFormGroup(sampleWithRequiredData);

        const condition = service.getCondition(formGroup) as any;

        expect(condition).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing ICondition should not enable id FormControl', () => {
        const formGroup = service.createConditionFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewCondition should disable id FormControl', () => {
        const formGroup = service.createConditionFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
