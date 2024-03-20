import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

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
  membership: FormControl<IProfile['membership']>;
  birthDate: FormControl<IProfile['birthDate']>;
  sex: FormControl<IProfile['sex']>;
  mobilePhone: FormControl<IProfile['mobilePhone']>;
  phoneNumber: FormControl<IProfile['phoneNumber']>;
  email: FormControl<IProfile['email']>;
  idType: FormControl<IProfile['idType']>;
  idNumber: FormControl<IProfile['idNumber']>;
  contacts: FormControl<IProfile['contacts']>;
  address: FormControl<IProfile['address']>;
};

export type ProfileFormGroup = FormGroup<ProfileFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ProfileFormService {
  createProfileFormGroup(profile: ProfileFormGroupInput = { id: null }): ProfileFormGroup {
    const profileRawValue = {
      ...this.getFormDefaults(),
      ...profile,
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
      membership: new FormControl(profileRawValue.membership),
      birthDate: new FormControl(profileRawValue.birthDate),
      sex: new FormControl(profileRawValue.sex),
      mobilePhone: new FormControl(profileRawValue.mobilePhone),
      phoneNumber: new FormControl(profileRawValue.phoneNumber),
      email: new FormControl(profileRawValue.email),
      idType: new FormControl(profileRawValue.idType),
      idNumber: new FormControl(profileRawValue.idNumber),
      contacts: new FormControl(profileRawValue.contacts),
      address: new FormControl(profileRawValue.address),
    });
  }

  getProfile(form: ProfileFormGroup): IProfile | NewProfile {
    return form.getRawValue() as IProfile | NewProfile;
  }

  resetForm(form: ProfileFormGroup, profile: ProfileFormGroupInput): void {
    const profileRawValue = { ...this.getFormDefaults(), ...profile };
    form.reset(
      {
        ...profileRawValue,
        id: { value: profileRawValue.id, disabled: true },
      } as any /* cast to workaround https://github.com/angular/angular/issues/46458 */,
    );
  }

  private getFormDefaults(): ProfileFormDefaults {
    return {
      id: null,
    };
  }
}
