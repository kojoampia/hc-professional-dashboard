import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IHealthConnectProfessional, NewHealthConnectProfessional } from '../health-connect-professional.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IHealthConnectProfessional for edit and NewHealthConnectProfessionalFormGroupInput for create.
 */
type HealthConnectProfessionalFormGroupInput = IHealthConnectProfessional | PartialWithRequiredKeyOf<NewHealthConnectProfessional>;

type HealthConnectProfessionalFormDefaults = Pick<NewHealthConnectProfessional, 'id'>;

type HealthConnectProfessionalFormGroupContent = {
  id: FormControl<IHealthConnectProfessional['id'] | NewHealthConnectProfessional['id']>;
  accountLogin: FormControl<IHealthConnectProfessional['accountLogin']>;
  name: FormControl<IHealthConnectProfessional['name']>;
  role: FormControl<IHealthConnectProfessional['role']>;
};

export type HealthConnectProfessionalFormGroup = FormGroup<HealthConnectProfessionalFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class HealthConnectProfessionalFormService {
  createHealthConnectProfessionalFormGroup(
    healthConnectProfessional?: HealthConnectProfessionalFormGroupInput,
  ): HealthConnectProfessionalFormGroup {
    const healthConnectProfessionalRawValue = {
      ...this.getFormDefaults(),
      ...(healthConnectProfessional ?? { id: null }),
    };
    return new FormGroup<HealthConnectProfessionalFormGroupContent>({
      id: new FormControl(
        { value: healthConnectProfessionalRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      accountLogin: new FormControl(healthConnectProfessionalRawValue.accountLogin),
      name: new FormControl(healthConnectProfessionalRawValue.name),
      role: new FormControl(healthConnectProfessionalRawValue.role),
    });
  }

  getHealthConnectProfessional(form: HealthConnectProfessionalFormGroup): IHealthConnectProfessional | NewHealthConnectProfessional {
    return form.getRawValue();
  }

  resetForm(form: HealthConnectProfessionalFormGroup, healthConnectProfessional: HealthConnectProfessionalFormGroupInput): void {
    const healthConnectProfessionalRawValue = { ...this.getFormDefaults(), ...healthConnectProfessional };
    form.reset(healthConnectProfessionalRawValue);
  }

  private getFormDefaults(): HealthConnectProfessionalFormDefaults {
    return {
      id: null,
    };
  }
}
