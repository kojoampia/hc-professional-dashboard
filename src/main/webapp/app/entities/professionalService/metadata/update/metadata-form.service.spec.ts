import { TestBed } from '@angular/core/testing';

import { sampleWithRequiredData, sampleWithNewData } from '../metadata.test-samples';

import { MetadataFormService } from './metadata-form.service';

describe('Metadata Form Service', () => {
  let service: MetadataFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetadataFormService);
  });

  describe('Service methods', () => {
    describe('createMetadataFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createMetadataFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            createdBy: expect.any(Object),
            modifiedBy: expect.any(Object),
            createdDate: expect.any(Object),
            modifiedDate: expect.any(Object),
            data: expect.any(Object),
          }),
        );
      });

      it('passing IMetadata should create a new form with FormGroup', () => {
        const formGroup = service.createMetadataFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            createdBy: expect.any(Object),
            modifiedBy: expect.any(Object),
            createdDate: expect.any(Object),
            modifiedDate: expect.any(Object),
            data: expect.any(Object),
          }),
        );
      });
    });

    describe('getMetadata', () => {
      it('should return NewMetadata for default Metadata initial value', () => {
        const formGroup = service.createMetadataFormGroup(sampleWithNewData);

        const metadata = service.getMetadata(formGroup) as any;

        expect(metadata).toMatchObject(sampleWithNewData);
      });

      it('should return NewMetadata for empty Metadata initial value', () => {
        const formGroup = service.createMetadataFormGroup();

        const metadata = service.getMetadata(formGroup) as any;

        expect(metadata).toMatchObject({});
      });

      it('should return IMetadata', () => {
        const formGroup = service.createMetadataFormGroup(sampleWithRequiredData);

        const metadata = service.getMetadata(formGroup) as any;

        expect(metadata).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IMetadata should not enable id FormControl', () => {
        const formGroup = service.createMetadataFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewMetadata should disable id FormControl', () => {
        const formGroup = service.createMetadataFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
