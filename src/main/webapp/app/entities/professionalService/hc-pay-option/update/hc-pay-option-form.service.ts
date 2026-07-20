import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { IHCPayOption, NewHCPayOption } from '../hc-pay-option.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IHCPayOption for edit and NewHCPayOptionFormGroupInput for create.
 */
type HCPayOptionFormGroupInput = IHCPayOption | PartialWithRequiredKeyOf<NewHCPayOption>;

type HCPayOptionFormDefaults = Pick<NewHCPayOption, 'id'>;

type HCPayOptionFormGroupContent = {
  id: FormControl<IHCPayOption['id'] | NewHCPayOption['id']>;
  type: FormControl<IHCPayOption['type']>;
  userID: FormControl<IHCPayOption['userID']>;
  metadata: FormControl<IHCPayOption['metadata']>;
};

export type HCPayOptionFormGroup = FormGroup<HCPayOptionFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class HCPayOptionFormService {
  createHCPayOptionFormGroup(hCPayOption: HCPayOptionFormGroupInput = { id: null }): HCPayOptionFormGroup {
    const hCPayOptionRawValue = {
      ...this.getFormDefaults(),
      ...hCPayOption,
    };
    return new FormGroup<HCPayOptionFormGroupContent>({
      id: new FormControl(
        { value: hCPayOptionRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      type: new FormControl(hCPayOptionRawValue.type),
      userID: new FormControl(hCPayOptionRawValue.userID),
      metadata: new FormControl(hCPayOptionRawValue.metadata),
    });
  }

  getHCPayOption(form: HCPayOptionFormGroup): IHCPayOption | NewHCPayOption {
    return form.getRawValue() as IHCPayOption | NewHCPayOption;
  }

  resetForm(form: HCPayOptionFormGroup, hCPayOption: HCPayOptionFormGroupInput): void {
    const hCPayOptionRawValue = { ...this.getFormDefaults(), ...hCPayOption };
    form.reset(
      {
        ...hCPayOptionRawValue,
        id: { value: hCPayOptionRawValue.id, disabled: true },
      } as any /* cast to workaround https://github.com/angular/angular/issues/46458 */,
    );
  }

  private getFormDefaults(): HCPayOptionFormDefaults {
    return {
      id: null,
    };
  }
}
