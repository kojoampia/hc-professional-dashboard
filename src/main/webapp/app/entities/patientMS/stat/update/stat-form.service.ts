import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { IStat, NewStat } from '../stat.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IStat for edit and NewStatFormGroupInput for create.
 */
type StatFormGroupInput = IStat | PartialWithRequiredKeyOf<NewStat>;

type StatFormDefaults = Pick<NewStat, 'id'>;

type StatFormGroupContent = {
  id: FormControl<IStat['id'] | NewStat['id']>;
  name: FormControl<IStat['name']>;
  description: FormControl<IStat['description']>;
  value: FormControl<IStat['value']>;
  note: FormControl<IStat['note']>;
  createdDate: FormControl<IStat['createdDate']>;
  createdBy: FormControl<IStat['createdBy']>;
};

export type StatFormGroup = FormGroup<StatFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class StatFormService {
  createStatFormGroup(stat: StatFormGroupInput = { id: null }): StatFormGroup {
    const statRawValue = {
      ...this.getFormDefaults(),
      ...stat,
    };
    return new FormGroup<StatFormGroupContent>({
      id: new FormControl(
        { value: statRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(statRawValue.name),
      description: new FormControl(statRawValue.description),
      value: new FormControl(statRawValue.value),
      note: new FormControl(statRawValue.note),
      createdDate: new FormControl(statRawValue.createdDate),
      createdBy: new FormControl(statRawValue.createdBy),
    });
  }

  getStat(form: StatFormGroup): IStat | NewStat {
    return form.getRawValue() as IStat | NewStat;
  }

  resetForm(form: StatFormGroup, stat: StatFormGroupInput): void {
    const statRawValue = { ...this.getFormDefaults(), ...stat };
    form.reset(
      {
        ...statRawValue,
        id: { value: statRawValue.id, disabled: true },
      } as any /* cast to workaround https://github.com/angular/angular/issues/46458 */,
    );
  }

  private getFormDefaults(): StatFormDefaults {
    return {
      id: null,
    };
  }
}
