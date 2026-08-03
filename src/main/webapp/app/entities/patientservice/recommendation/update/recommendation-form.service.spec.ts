import { TestBed } from '@angular/core/testing';

import { sampleWithNewData, sampleWithRequiredData } from '../recommendation.test-samples';

import { RecommendationFormService } from './recommendation-form.service';

describe('Recommendation Form Service', () => {
  let service: RecommendationFormService;

  beforeEach(() => {
    service = TestBed.inject(RecommendationFormService);
  });

  describe('Service methods', () => {
    describe('createRecommendationFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createRecommendationFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            label: expect.any(Object),
            category: expect.any(Object),
          }),
        );
      });

      it('passing IRecommendation should create a new form with FormGroup', () => {
        const formGroup = service.createRecommendationFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            label: expect.any(Object),
            category: expect.any(Object),
          }),
        );
      });
    });

    describe('getRecommendation', () => {
      it('should return NewRecommendation for default Recommendation initial value', () => {
        const formGroup = service.createRecommendationFormGroup(sampleWithNewData);

        const recommendation = service.getRecommendation(formGroup);

        expect(recommendation).toMatchObject(sampleWithNewData);
      });

      it('should return NewRecommendation for empty Recommendation initial value', () => {
        const formGroup = service.createRecommendationFormGroup();

        const recommendation = service.getRecommendation(formGroup);

        expect(recommendation).toMatchObject({});
      });

      it('should return IRecommendation', () => {
        const formGroup = service.createRecommendationFormGroup(sampleWithRequiredData);

        const recommendation = service.getRecommendation(formGroup);

        expect(recommendation).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IRecommendation should not enable id FormControl', () => {
        const formGroup = service.createRecommendationFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewRecommendation should disable id FormControl', () => {
        const formGroup = service.createRecommendationFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
