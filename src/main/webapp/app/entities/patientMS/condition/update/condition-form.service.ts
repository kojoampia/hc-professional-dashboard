import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { ICondition, NewCondition } from '../condition.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts ICondition for edit and NewConditionFormGroupInput for create.
 */
type ConditionFormGroupInput = ICondition | PartialWithRequiredKeyOf<NewCondition>;

type ConditionFormDefaults = Pick<NewCondition, 'id'>;

type ConditionFormGroupContent = {
  id: FormControl<ICondition['id'] | NewCondition['id']>;
  name: FormControl<ICondition['name']>;
  description: FormControl<ICondition['description']>;
  createdDate: FormControl<ICondition['createdDate']>;
  modifiedDate: FormControl<ICondition['modifiedDate']>;
  createdBy: FormControl<ICondition['createdBy']>;
  modifiedBy: FormControl<ICondition['modifiedBy']>;
};

export type ConditionFormGroup = FormGroup<ConditionFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ConditionFormService {
  createConditionFormGroup(condition: ConditionFormGroupInput = { id: null }): ConditionFormGroup {
    const conditionRawValue = {
      ...this.getFormDefaults(),
      ...condition,
    };
    return new FormGroup<ConditionFormGroupContent>({
      id: new FormControl(
        { value: conditionRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(conditionRawValue.name),
      description: new FormControl(conditionRawValue.description),
      createdDate: new FormControl(conditionRawValue.createdDate),
      modifiedDate: new FormControl(conditionRawValue.modifiedDate),
      createdBy: new FormControl(conditionRawValue.createdBy),
      modifiedBy: new FormControl(conditionRawValue.modifiedBy),
    });
  }

  getCondition(form: ConditionFormGroup): ICondition | NewCondition {
    return form.getRawValue() as ICondition | NewCondition;
  }

  resetForm(form: ConditionFormGroup, condition: ConditionFormGroupInput): void {
    const conditionRawValue = { ...this.getFormDefaults(), ...condition };
    form.reset(
      {
        ...conditionRawValue,
        id: { value: conditionRawValue.id, disabled: true },
      } as any /* cast to workaround https://github.com/angular/angular/issues/46458 */,
    );
  }

  private getFormDefaults(): ConditionFormDefaults {
    return {
      id: null,
    };
  }
}
