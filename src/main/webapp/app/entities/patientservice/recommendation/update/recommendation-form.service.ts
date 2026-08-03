import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IRecommendation, NewRecommendation } from '../recommendation.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IRecommendation for edit and NewRecommendationFormGroupInput for create.
 */
type RecommendationFormGroupInput = IRecommendation | PartialWithRequiredKeyOf<NewRecommendation>;

type RecommendationFormDefaults = Pick<NewRecommendation, 'id'>;

type RecommendationFormGroupContent = {
  id: FormControl<IRecommendation['id'] | NewRecommendation['id']>;
  label: FormControl<IRecommendation['label']>;
  category: FormControl<IRecommendation['category']>;
};

export type RecommendationFormGroup = FormGroup<RecommendationFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class RecommendationFormService {
  createRecommendationFormGroup(recommendation?: RecommendationFormGroupInput): RecommendationFormGroup {
    const recommendationRawValue = {
      ...this.getFormDefaults(),
      ...(recommendation ?? { id: null }),
    };
    return new FormGroup<RecommendationFormGroupContent>({
      id: new FormControl(
        { value: recommendationRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      label: new FormControl(recommendationRawValue.label),
      category: new FormControl(recommendationRawValue.category),
    });
  }

  getRecommendation(form: RecommendationFormGroup): IRecommendation | NewRecommendation {
    return form.getRawValue();
  }

  resetForm(form: RecommendationFormGroup, recommendation: RecommendationFormGroupInput): void {
    const recommendationRawValue = { ...this.getFormDefaults(), ...recommendation };
    form.reset(recommendationRawValue);
  }

  private getFormDefaults(): RecommendationFormDefaults {
    return {
      id: null,
    };
  }
}
