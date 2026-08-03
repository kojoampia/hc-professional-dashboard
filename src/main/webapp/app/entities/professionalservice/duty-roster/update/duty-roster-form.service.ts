import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IDutyRoster, NewDutyRoster } from '../duty-roster.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IDutyRoster for edit and NewDutyRosterFormGroupInput for create.
 */
type DutyRosterFormGroupInput = IDutyRoster | PartialWithRequiredKeyOf<NewDutyRoster>;

type DutyRosterFormDefaults = Pick<NewDutyRoster, 'id' | 'subscribedProfessionals'>;

type DutyRosterFormGroupContent = {
  id: FormControl<IDutyRoster['id'] | NewDutyRoster['id']>;
  name: FormControl<IDutyRoster['name']>;
  subscribedProfessionals: FormControl<IDutyRoster['subscribedProfessionals']>;
};

export type DutyRosterFormGroup = FormGroup<DutyRosterFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class DutyRosterFormService {
  createDutyRosterFormGroup(dutyRoster?: DutyRosterFormGroupInput): DutyRosterFormGroup {
    const dutyRosterRawValue = {
      ...this.getFormDefaults(),
      ...(dutyRoster ?? { id: null }),
    };
    return new FormGroup<DutyRosterFormGroupContent>({
      id: new FormControl(
        { value: dutyRosterRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(dutyRosterRawValue.name),
      subscribedProfessionals: new FormControl(dutyRosterRawValue.subscribedProfessionals ?? []),
    });
  }

  getDutyRoster(form: DutyRosterFormGroup): IDutyRoster | NewDutyRoster {
    return form.getRawValue();
  }

  resetForm(form: DutyRosterFormGroup, dutyRoster: DutyRosterFormGroupInput): void {
    const dutyRosterRawValue = { ...this.getFormDefaults(), ...dutyRoster };
    form.reset(dutyRosterRawValue);
  }

  private getFormDefaults(): DutyRosterFormDefaults {
    return {
      id: null,
      subscribedProfessionals: [],
    };
  }
}
