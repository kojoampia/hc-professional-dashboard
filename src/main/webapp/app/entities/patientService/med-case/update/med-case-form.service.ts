import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IMedCase, NewMedCase } from '../med-case.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IMedCase for edit and NewMedCaseFormGroupInput for create.
 */
type MedCaseFormGroupInput = IMedCase | PartialWithRequiredKeyOf<NewMedCase>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IMedCase | NewMedCase> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

type MedCaseFormRawValue = FormValueOf<IMedCase>;

type NewMedCaseFormRawValue = FormValueOf<NewMedCase>;

type MedCaseFormDefaults = Pick<NewMedCase, 'id' | 'createdDate' | 'modifiedDate'>;

type MedCaseFormGroupContent = {
  id: FormControl<MedCaseFormRawValue['id'] | NewMedCase['id']>;
  symptoms: FormControl<MedCaseFormRawValue['symptoms']>;
  diagnoses: FormControl<MedCaseFormRawValue['diagnoses']>;
  recommendations: FormControl<MedCaseFormRawValue['recommendations']>;
  createdDate: FormControl<MedCaseFormRawValue['createdDate']>;
  createdBy: FormControl<MedCaseFormRawValue['createdBy']>;
  modifiedDate: FormControl<MedCaseFormRawValue['modifiedDate']>;
  modifiedBy: FormControl<MedCaseFormRawValue['modifiedBy']>;
};

export type MedCaseFormGroup = FormGroup<MedCaseFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class MedCaseFormService {
  createMedCaseFormGroup(medCase?: MedCaseFormGroupInput): MedCaseFormGroup {
    const medCaseRawValue = this.convertMedCaseToMedCaseRawValue({
      ...this.getFormDefaults(),
      ...(medCase ?? { id: null }),
    });
    return new FormGroup<MedCaseFormGroupContent>({
      id: new FormControl(
        { value: medCaseRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      symptoms: new FormControl(medCaseRawValue.symptoms),
      diagnoses: new FormControl(medCaseRawValue.diagnoses),
      recommendations: new FormControl(medCaseRawValue.recommendations),
      createdDate: new FormControl(medCaseRawValue.createdDate),
      createdBy: new FormControl(medCaseRawValue.createdBy),
      modifiedDate: new FormControl(medCaseRawValue.modifiedDate),
      modifiedBy: new FormControl(medCaseRawValue.modifiedBy),
    });
  }

  getMedCase(form: MedCaseFormGroup): IMedCase | NewMedCase {
    return this.convertMedCaseRawValueToMedCase(form.getRawValue());
  }

  resetForm(form: MedCaseFormGroup, medCase: MedCaseFormGroupInput): void {
    const medCaseRawValue = this.convertMedCaseToMedCaseRawValue({ ...this.getFormDefaults(), ...medCase });
    form.reset({
      ...medCaseRawValue,
      id: { value: medCaseRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): MedCaseFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      createdDate: currentTime,
      modifiedDate: currentTime,
    };
  }

  private convertMedCaseRawValueToMedCase(rawMedCase: MedCaseFormRawValue | NewMedCaseFormRawValue): IMedCase | NewMedCase {
    return {
      ...rawMedCase,
      createdDate: dayjs(rawMedCase.createdDate, DATE_TIME_FORMAT),
      modifiedDate: dayjs(rawMedCase.modifiedDate, DATE_TIME_FORMAT),
    };
  }

  private convertMedCaseToMedCaseRawValue(
    medCase: IMedCase | (Partial<NewMedCase> & MedCaseFormDefaults),
  ): MedCaseFormRawValue | PartialWithRequiredKeyOf<NewMedCaseFormRawValue> {
    return {
      ...medCase,
      createdDate: medCase.createdDate ? medCase.createdDate.format(DATE_TIME_FORMAT) : undefined,
      modifiedDate: medCase.modifiedDate ? medCase.modifiedDate.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
