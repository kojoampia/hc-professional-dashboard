import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../clinical-report.test-samples';

import { ClinicalReportFormService } from './clinical-report-form.service';

describe('ClinicalReport Form Service', () => {
  let service: ClinicalReportFormService;

  beforeEach(() => {
    service = TestBed.inject(ClinicalReportFormService);
  });

  describe('Service methods', () => {
    describe('createClinicalReportFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createClinicalReportFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            patientId: expect.any(Object),
            occurredAt: expect.any(Object),
            label: expect.any(Object),
            reportType: expect.any(Object),
            url: expect.any(Object),
          }),
        );
      });

      it('passing IClinicalReport should create a new form with FormGroup', () => {
        const formGroup = service.createClinicalReportFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            patientId: expect.any(Object),
            occurredAt: expect.any(Object),
            label: expect.any(Object),
            reportType: expect.any(Object),
            url: expect.any(Object),
          }),
        );
      });
    });

    describe('getClinicalReport', () => {
      it('should return NewClinicalReport for default ClinicalReport initial value', () => {
        const formGroup = service.createClinicalReportFormGroup(sampleWithNewData);

        const clinicalReport = service.getClinicalReport(formGroup);

        expect(clinicalReport).toMatchObject(sampleWithNewData);
      });

      it('should return NewClinicalReport for empty ClinicalReport initial value', () => {
        const formGroup = service.createClinicalReportFormGroup();

        const clinicalReport = service.getClinicalReport(formGroup);

        expect(clinicalReport).toMatchObject({});
      });

      it('should return IClinicalReport', () => {
        const formGroup = service.createClinicalReportFormGroup(sampleWithRequiredData);

        const clinicalReport = service.getClinicalReport(formGroup);

        expect(clinicalReport).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IClinicalReport should not enable id FormControl', () => {
        const formGroup = service.createClinicalReportFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewClinicalReport should disable id FormControl', () => {
        const formGroup = service.createClinicalReportFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
