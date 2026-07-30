import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IProfile, NewProfile } from '../profile.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IProfile for edit and NewProfileFormGroupInput for create.
 */
type ProfileFormGroupInput = IProfile | PartialWithRequiredKeyOf<NewProfile>;

type ProfileFormDefaults = Pick<NewProfile, 'id'>;

type ProfileFormGroupContent = {
  id: FormControl<IProfile['id'] | NewProfile['id']>;
  firstName: FormControl<IProfile['firstName']>;
  middleNames: FormControl<IProfile['middleNames']>;
  lastName: FormControl<IProfile['lastName']>;
  team: FormControl<IProfile['team']>;
  birthDate: FormControl<IProfile['birthDate']>;
  sex: FormControl<IProfile['sex']>;
  mobilePhone: FormControl<IProfile['mobilePhone']>;
  phoneNumber: FormControl<IProfile['phoneNumber']>;
  email: FormControl<IProfile['email']>;
  idType: FormControl<IProfile['idType']>;
  idNumber: FormControl<IProfile['idNumber']>;
  documents: FormControl<IProfile['documents']>;
  address: FormControl<IProfile['address']>;
  bankAccount: FormControl<IProfile['bankAccount']>;
  tenantId: FormControl<IProfile['tenantId']>;
  rosterId: FormControl<IProfile['rosterId']>;
  teamId: FormControl<IProfile['teamId']>;
};

export type ProfileFormGroup = FormGroup<ProfileFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ProfileFormService {
  createProfileFormGroup(profile?: ProfileFormGroupInput): ProfileFormGroup {
    const profileRawValue = {
      ...this.getFormDefaults(),
      ...(profile ?? { id: null }),
    };
    return new FormGroup<ProfileFormGroupContent>({
      id: new FormControl(
        { value: profileRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      firstName: new FormControl(profileRawValue.firstName),
      middleNames: new FormControl(profileRawValue.middleNames),
      lastName: new FormControl(profileRawValue.lastName),
      team: new FormControl(profileRawValue.team),
      birthDate: new FormControl(profileRawValue.birthDate),
      sex: new FormControl(profileRawValue.sex),
      mobilePhone: new FormControl(profileRawValue.mobilePhone),
      phoneNumber: new FormControl(profileRawValue.phoneNumber),
      email: new FormControl(profileRawValue.email),
      idType: new FormControl(profileRawValue.idType),
      idNumber: new FormControl(profileRawValue.idNumber),
      documents: new FormControl(profileRawValue.documents),
      address: new FormControl(profileRawValue.address),
      bankAccount: new FormControl(profileRawValue.bankAccount),
      tenantId: new FormControl(profileRawValue.tenantId),
      rosterId: new FormControl(profileRawValue.rosterId),
      teamId: new FormControl(profileRawValue.teamId),
    });
  }

  getProfile(form: ProfileFormGroup): IProfile | NewProfile {
    return form.getRawValue();
  }

  resetForm(form: ProfileFormGroup, profile: ProfileFormGroupInput): void {
    const profileRawValue = { ...this.getFormDefaults(), ...profile };
    form.reset(profileRawValue);
  }

  private getFormDefaults(): ProfileFormDefaults {
    return {
      id: null,
    };
  }
}
