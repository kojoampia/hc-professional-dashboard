import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { IAddress, NewAddress } from '../address.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IAddress for edit and NewAddressFormGroupInput for create.
 */
type AddressFormGroupInput = IAddress | PartialWithRequiredKeyOf<NewAddress>;

type AddressFormDefaults = Pick<NewAddress, 'id'>;

type AddressFormGroupContent = {
  id: FormControl<IAddress['id'] | NewAddress['id']>;
  digitalAddress: FormControl<IAddress['digitalAddress']>;
  streetAddress: FormControl<IAddress['streetAddress']>;
  areaCode: FormControl<IAddress['areaCode']>;
  town: FormControl<IAddress['town']>;
  city: FormControl<IAddress['city']>;
  district: FormControl<IAddress['district']>;
  state: FormControl<IAddress['state']>;
  region: FormControl<IAddress['region']>;
  country: FormControl<IAddress['country']>;
  createdDate: FormControl<IAddress['createdDate']>;
  modifiedDate: FormControl<IAddress['modifiedDate']>;
  createdBy: FormControl<IAddress['createdBy']>;
  modifiedBy: FormControl<IAddress['modifiedBy']>;
};

export type AddressFormGroup = FormGroup<AddressFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class AddressFormService {
  createAddressFormGroup(address: AddressFormGroupInput = { id: null }): AddressFormGroup {
    const addressRawValue = {
      ...this.getFormDefaults(),
      ...address,
    };
    return new FormGroup<AddressFormGroupContent>({
      id: new FormControl(
        { value: addressRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      digitalAddress: new FormControl(addressRawValue.digitalAddress),
      streetAddress: new FormControl(addressRawValue.streetAddress),
      areaCode: new FormControl(addressRawValue.areaCode),
      town: new FormControl(addressRawValue.town),
      city: new FormControl(addressRawValue.city),
      district: new FormControl(addressRawValue.district),
      state: new FormControl(addressRawValue.state),
      region: new FormControl(addressRawValue.region),
      country: new FormControl(addressRawValue.country),
      createdDate: new FormControl(addressRawValue.createdDate),
      modifiedDate: new FormControl(addressRawValue.modifiedDate),
      createdBy: new FormControl(addressRawValue.createdBy),
      modifiedBy: new FormControl(addressRawValue.modifiedBy),
    });
  }

  getAddress(form: AddressFormGroup): IAddress | NewAddress {
    return form.getRawValue() as IAddress | NewAddress;
  }

  resetForm(form: AddressFormGroup, address: AddressFormGroupInput): void {
    const addressRawValue = { ...this.getFormDefaults(), ...address };
    form.reset(
      {
        ...addressRawValue,
        id: { value: addressRawValue.id, disabled: true },
      } as any /* cast to workaround https://github.com/angular/angular/issues/46458 */,
    );
  }

  private getFormDefaults(): AddressFormDefaults {
    return {
      id: null,
    };
  }
}
