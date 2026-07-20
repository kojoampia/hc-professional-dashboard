import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { IHCCredential, NewHCCredential } from '../hc-credential.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IHCCredential for edit and NewHCCredentialFormGroupInput for create.
 */
type HCCredentialFormGroupInput = IHCCredential | PartialWithRequiredKeyOf<NewHCCredential>;

type HCCredentialFormDefaults = Pick<NewHCCredential, 'id' | 'active'>;

type HCCredentialFormGroupContent = {
  id: FormControl<IHCCredential['id'] | NewHCCredential['id']>;
  email: FormControl<IHCCredential['email']>;
  phoneNumber: FormControl<IHCCredential['phoneNumber']>;
  password: FormControl<IHCCredential['password']>;
  role: FormControl<IHCCredential['role']>;
  createdDate: FormControl<IHCCredential['createdDate']>;
  active: FormControl<IHCCredential['active']>;
  modifiedDate: FormControl<IHCCredential['modifiedDate']>;
};

export type HCCredentialFormGroup = FormGroup<HCCredentialFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class HCCredentialFormService {
  createHCCredentialFormGroup(hCCredential: HCCredentialFormGroupInput = { id: null }): HCCredentialFormGroup {
    const hCCredentialRawValue = {
      ...this.getFormDefaults(),
      ...hCCredential,
    };
    return new FormGroup<HCCredentialFormGroupContent>({
      id: new FormControl(
        { value: hCCredentialRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      email: new FormControl(hCCredentialRawValue.email),
      phoneNumber: new FormControl(hCCredentialRawValue.phoneNumber),
      password: new FormControl(hCCredentialRawValue.password),
      role: new FormControl(hCCredentialRawValue.role),
      createdDate: new FormControl(hCCredentialRawValue.createdDate),
      active: new FormControl(hCCredentialRawValue.active),
      modifiedDate: new FormControl(hCCredentialRawValue.modifiedDate),
    });
  }

  getHCCredential(form: HCCredentialFormGroup): IHCCredential | NewHCCredential {
    return form.getRawValue() as IHCCredential | NewHCCredential;
  }

  resetForm(form: HCCredentialFormGroup, hCCredential: HCCredentialFormGroupInput): void {
    const hCCredentialRawValue = { ...this.getFormDefaults(), ...hCCredential };
    form.reset(
      {
        ...hCCredentialRawValue,
        id: { value: hCCredentialRawValue.id, disabled: true },
      } as any /* cast to workaround https://github.com/angular/angular/issues/46458 */,
    );
  }

  private getFormDefaults(): HCCredentialFormDefaults {
    return {
      id: null,
      active: false,
    };
  }
}
