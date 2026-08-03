import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IClinicalCase, NewClinicalCase } from '../clinical-case.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IClinicalCase for edit and NewClinicalCaseFormGroupInput for create.
 */
type ClinicalCaseFormGroupInput = IClinicalCase | PartialWithRequiredKeyOf<NewClinicalCase>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IClinicalCase | NewClinicalCase> = Omit<T, 'openedAt'> & {
  openedAt?: string | null;
};

type ClinicalCaseFormRawValue = FormValueOf<IClinicalCase>;

type NewClinicalCaseFormRawValue = FormValueOf<NewClinicalCase>;

type ClinicalCaseFormDefaults = Pick<NewClinicalCase, 'id' | 'openedAt' | 'recommendations'>;

type ClinicalCaseFormGroupContent = {
  id: FormControl<ClinicalCaseFormRawValue['id'] | NewClinicalCase['id']>;
  patientId: FormControl<ClinicalCaseFormRawValue['patientId']>;
  openedAt: FormControl<ClinicalCaseFormRawValue['openedAt']>;
  brief: FormControl<ClinicalCaseFormRawValue['brief']>;
  status: FormControl<ClinicalCaseFormRawValue['status']>;
  symptoms: FormControl<ClinicalCaseFormRawValue['symptoms']>;
  diagnosis: FormControl<ClinicalCaseFormRawValue['diagnosis']>;
  assignedProfessionalId: FormControl<ClinicalCaseFormRawValue['assignedProfessionalId']>;
  assignedRosterId: FormControl<ClinicalCaseFormRawValue['assignedRosterId']>;
  recommendations: FormControl<ClinicalCaseFormRawValue['recommendations']>;
};

export type ClinicalCaseFormGroup = FormGroup<ClinicalCaseFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ClinicalCaseFormService {
  createClinicalCaseFormGroup(clinicalCase?: ClinicalCaseFormGroupInput): ClinicalCaseFormGroup {
    const clinicalCaseRawValue = this.convertClinicalCaseToClinicalCaseRawValue({
      ...this.getFormDefaults(),
      ...(clinicalCase ?? { id: null }),
    });
    return new FormGroup<ClinicalCaseFormGroupContent>({
      id: new FormControl(
        { value: clinicalCaseRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      patientId: new FormControl(clinicalCaseRawValue.patientId),
      openedAt: new FormControl(clinicalCaseRawValue.openedAt),
      brief: new FormControl(clinicalCaseRawValue.brief),
      status: new FormControl(clinicalCaseRawValue.status),
      symptoms: new FormControl(clinicalCaseRawValue.symptoms),
      diagnosis: new FormControl(clinicalCaseRawValue.diagnosis),
      assignedProfessionalId: new FormControl(clinicalCaseRawValue.assignedProfessionalId),
      assignedRosterId: new FormControl(clinicalCaseRawValue.assignedRosterId),
      recommendations: new FormControl(clinicalCaseRawValue.recommendations ?? []),
    });
  }

  getClinicalCase(form: ClinicalCaseFormGroup): IClinicalCase | NewClinicalCase {
    return this.convertClinicalCaseRawValueToClinicalCase(form.getRawValue());
  }

  resetForm(form: ClinicalCaseFormGroup, clinicalCase: ClinicalCaseFormGroupInput): void {
    const clinicalCaseRawValue = this.convertClinicalCaseToClinicalCaseRawValue({ ...this.getFormDefaults(), ...clinicalCase });
    form.reset(clinicalCaseRawValue);
  }

  private getFormDefaults(): ClinicalCaseFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      openedAt: currentTime,
      recommendations: [],
    };
  }

  private convertClinicalCaseRawValueToClinicalCase(
    rawClinicalCase: ClinicalCaseFormRawValue | NewClinicalCaseFormRawValue,
  ): IClinicalCase | NewClinicalCase {
    return {
      ...rawClinicalCase,
      openedAt: dayjs(rawClinicalCase.openedAt, DATE_TIME_FORMAT),
    };
  }

  private convertClinicalCaseToClinicalCaseRawValue(
    clinicalCase: IClinicalCase | (Partial<NewClinicalCase> & ClinicalCaseFormDefaults),
  ): ClinicalCaseFormRawValue | PartialWithRequiredKeyOf<NewClinicalCaseFormRawValue> {
    return {
      ...clinicalCase,
      openedAt: clinicalCase.openedAt ? clinicalCase.openedAt.format(DATE_TIME_FORMAT) : undefined,
      recommendations: clinicalCase.recommendations ?? [],
    };
  }
}
