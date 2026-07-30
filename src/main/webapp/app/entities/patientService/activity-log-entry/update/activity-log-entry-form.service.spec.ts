import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../activity-log-entry.test-samples';

import { ActivityLogEntryFormService } from './activity-log-entry-form.service';

describe('ActivityLogEntry Form Service', () => {
  let service: ActivityLogEntryFormService;

  beforeEach(() => {
    service = TestBed.inject(ActivityLogEntryFormService);
  });

  describe('Service methods', () => {
    describe('createActivityLogEntryFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createActivityLogEntryFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            patientId: expect.any(Object),
            occurredAt: expect.any(Object),
            label: expect.any(Object),
            title: expect.any(Object),
            description: expect.any(Object),
            createdAt: expect.any(Object),
          }),
        );
      });

      it('passing IActivityLogEntry should create a new form with FormGroup', () => {
        const formGroup = service.createActivityLogEntryFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            patientId: expect.any(Object),
            occurredAt: expect.any(Object),
            label: expect.any(Object),
            title: expect.any(Object),
            description: expect.any(Object),
            createdAt: expect.any(Object),
          }),
        );
      });
    });

    describe('getActivityLogEntry', () => {
      it('should return NewActivityLogEntry for default ActivityLogEntry initial value', () => {
        const formGroup = service.createActivityLogEntryFormGroup(sampleWithNewData);

        const activityLogEntry = service.getActivityLogEntry(formGroup);

        expect(activityLogEntry).toMatchObject(sampleWithNewData);
      });

      it('should return NewActivityLogEntry for empty ActivityLogEntry initial value', () => {
        const formGroup = service.createActivityLogEntryFormGroup();

        const activityLogEntry = service.getActivityLogEntry(formGroup);

        expect(activityLogEntry).toMatchObject({});
      });

      it('should return IActivityLogEntry', () => {
        const formGroup = service.createActivityLogEntryFormGroup(sampleWithRequiredData);

        const activityLogEntry = service.getActivityLogEntry(formGroup);

        expect(activityLogEntry).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IActivityLogEntry should not enable id FormControl', () => {
        const formGroup = service.createActivityLogEntryFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewActivityLogEntry should disable id FormControl', () => {
        const formGroup = service.createActivityLogEntryFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
