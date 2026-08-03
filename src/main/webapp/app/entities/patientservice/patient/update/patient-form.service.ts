import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IPatient, NewPatient } from '../patient.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IPatient for edit and NewPatientFormGroupInput for create.
 */
type PatientFormGroupInput = IPatient | PartialWithRequiredKeyOf<NewPatient>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IPatient | NewPatient> = Omit<T, 'lastActivityAt'> & {
  lastActivityAt?: string | null;
};

type PatientFormRawValue = FormValueOf<IPatient>;

type NewPatientFormRawValue = FormValueOf<NewPatient>;

type PatientFormDefaults = Pick<NewPatient, 'id' | 'lastActivityAt' | 'isChild'>;

type PatientFormGroupContent = {
  id: FormControl<PatientFormRawValue['id'] | NewPatient['id']>;
  patientName: FormControl<PatientFormRawValue['patientName']>;
  lastActivityAt: FormControl<PatientFormRawValue['lastActivityAt']>;
  sex: FormControl<PatientFormRawValue['sex']>;
  isChild: FormControl<PatientFormRawValue['isChild']>;
  dateOfBirth: FormControl<PatientFormRawValue['dateOfBirth']>;
  phone: FormControl<PatientFormRawValue['phone']>;
  email: FormControl<PatientFormRawValue['email']>;
  emergencyContactName: FormControl<PatientFormRawValue['emergencyContactName']>;
  emergencyContactPhone: FormControl<PatientFormRawValue['emergencyContactPhone']>;
  avatarUrl: FormControl<PatientFormRawValue['avatarUrl']>;
};

export type PatientFormGroup = FormGroup<PatientFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class PatientFormService {
  createPatientFormGroup(patient?: PatientFormGroupInput): PatientFormGroup {
    const patientRawValue = this.convertPatientToPatientRawValue({
      ...this.getFormDefaults(),
      ...(patient ?? { id: null }),
    });
    return new FormGroup<PatientFormGroupContent>({
      id: new FormControl(
        { value: patientRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      patientName: new FormControl(patientRawValue.patientName),
      lastActivityAt: new FormControl(patientRawValue.lastActivityAt),
      sex: new FormControl(patientRawValue.sex),
      isChild: new FormControl(patientRawValue.isChild),
      dateOfBirth: new FormControl(patientRawValue.dateOfBirth),
      phone: new FormControl(patientRawValue.phone),
      email: new FormControl(patientRawValue.email),
      emergencyContactName: new FormControl(patientRawValue.emergencyContactName),
      emergencyContactPhone: new FormControl(patientRawValue.emergencyContactPhone),
      avatarUrl: new FormControl(patientRawValue.avatarUrl),
    });
  }

  getPatient(form: PatientFormGroup): IPatient | NewPatient {
    return this.convertPatientRawValueToPatient(form.getRawValue());
  }

  resetForm(form: PatientFormGroup, patient: PatientFormGroupInput): void {
    const patientRawValue = this.convertPatientToPatientRawValue({ ...this.getFormDefaults(), ...patient });
    form.reset(patientRawValue);
  }

  private getFormDefaults(): PatientFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      lastActivityAt: currentTime,
      isChild: false,
    };
  }

  private convertPatientRawValueToPatient(rawPatient: PatientFormRawValue | NewPatientFormRawValue): IPatient | NewPatient {
    return {
      ...rawPatient,
      lastActivityAt: dayjs(rawPatient.lastActivityAt, DATE_TIME_FORMAT),
    };
  }

  private convertPatientToPatientRawValue(
    patient: IPatient | (Partial<NewPatient> & PatientFormDefaults),
  ): PatientFormRawValue | PartialWithRequiredKeyOf<NewPatientFormRawValue> {
    return {
      ...patient,
      lastActivityAt: patient.lastActivityAt ? patient.lastActivityAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
