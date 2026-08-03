import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../health-connect-professional.test-samples';

import { HealthConnectProfessionalFormService } from './health-connect-professional-form.service';

describe('HealthConnectProfessional Form Service', () => {
  let service: HealthConnectProfessionalFormService;

  beforeEach(() => {
    service = TestBed.inject(HealthConnectProfessionalFormService);
  });

  describe('Service methods', () => {
    describe('createHealthConnectProfessionalFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createHealthConnectProfessionalFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            accountLogin: expect.any(Object),
            name: expect.any(Object),
            role: expect.any(Object),
          }),
        );
      });

      it('passing IHealthConnectProfessional should create a new form with FormGroup', () => {
        const formGroup = service.createHealthConnectProfessionalFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            accountLogin: expect.any(Object),
            name: expect.any(Object),
            role: expect.any(Object),
          }),
        );
      });
    });

    describe('getHealthConnectProfessional', () => {
      it('should return NewHealthConnectProfessional for default HealthConnectProfessional initial value', () => {
        const formGroup = service.createHealthConnectProfessionalFormGroup(sampleWithNewData);

        const healthConnectProfessional = service.getHealthConnectProfessional(formGroup);

        expect(healthConnectProfessional).toMatchObject(sampleWithNewData);
      });

      it('should return NewHealthConnectProfessional for empty HealthConnectProfessional initial value', () => {
        const formGroup = service.createHealthConnectProfessionalFormGroup();

        const healthConnectProfessional = service.getHealthConnectProfessional(formGroup);

        expect(healthConnectProfessional).toMatchObject({});
      });

      it('should return IHealthConnectProfessional', () => {
        const formGroup = service.createHealthConnectProfessionalFormGroup(sampleWithRequiredData);

        const healthConnectProfessional = service.getHealthConnectProfessional(formGroup);

        expect(healthConnectProfessional).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IHealthConnectProfessional should not enable id FormControl', () => {
        const formGroup = service.createHealthConnectProfessionalFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewHealthConnectProfessional should disable id FormControl', () => {
        const formGroup = service.createHealthConnectProfessionalFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
