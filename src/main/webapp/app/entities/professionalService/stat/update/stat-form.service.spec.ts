import { TestBed } from '@angular/core/testing';

import { sampleWithRequiredData, sampleWithNewData } from '../stat.test-samples';

import { StatFormService } from './stat-form.service';

describe('Stat Form Service', () => {
  let service: StatFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatFormService);
  });

  describe('Service methods', () => {
    describe('createStatFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createStatFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            type: expect.any(Object),
            name: expect.any(Object),
            description: expect.any(Object),
            value: expect.any(Object),
            note: expect.any(Object),
            createdDate: expect.any(Object),
            createdBy: expect.any(Object),
          }),
        );
      });

      it('passing IStat should create a new form with FormGroup', () => {
        const formGroup = service.createStatFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            type: expect.any(Object),
            name: expect.any(Object),
            description: expect.any(Object),
            value: expect.any(Object),
            note: expect.any(Object),
            createdDate: expect.any(Object),
            createdBy: expect.any(Object),
          }),
        );
      });
    });

    describe('getStat', () => {
      it('should return NewStat for default Stat initial value', () => {
        const formGroup = service.createStatFormGroup(sampleWithNewData);

        const stat = service.getStat(formGroup) as any;

        expect(stat).toMatchObject(sampleWithNewData);
      });

      it('should return NewStat for empty Stat initial value', () => {
        const formGroup = service.createStatFormGroup();

        const stat = service.getStat(formGroup) as any;

        expect(stat).toMatchObject({});
      });

      it('should return IStat', () => {
        const formGroup = service.createStatFormGroup(sampleWithRequiredData);

        const stat = service.getStat(formGroup) as any;

        expect(stat).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IStat should not enable id FormControl', () => {
        const formGroup = service.createStatFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewStat should disable id FormControl', () => {
        const formGroup = service.createStatFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
