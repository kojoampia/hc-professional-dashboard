import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IMedicationRecord, NewMedicationRecord } from '../medication-record.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IMedicationRecord for edit and NewMedicationRecordFormGroupInput for create.
 */
type MedicationRecordFormGroupInput = IMedicationRecord | PartialWithRequiredKeyOf<NewMedicationRecord>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IMedicationRecord | NewMedicationRecord> = Omit<T, 'occurredAt'> & {
  occurredAt?: string | null;
};

type MedicationRecordFormRawValue = FormValueOf<IMedicationRecord>;

type NewMedicationRecordFormRawValue = FormValueOf<NewMedicationRecord>;

type MedicationRecordFormDefaults = Pick<NewMedicationRecord, 'id' | 'occurredAt'>;

type MedicationRecordFormGroupContent = {
  id: FormControl<MedicationRecordFormRawValue['id'] | NewMedicationRecord['id']>;
  patientId: FormControl<MedicationRecordFormRawValue['patientId']>;
  occurredAt: FormControl<MedicationRecordFormRawValue['occurredAt']>;
  label: FormControl<MedicationRecordFormRawValue['label']>;
};

export type MedicationRecordFormGroup = FormGroup<MedicationRecordFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class MedicationRecordFormService {
  createMedicationRecordFormGroup(medicationRecord?: MedicationRecordFormGroupInput): MedicationRecordFormGroup {
    const medicationRecordRawValue = this.convertMedicationRecordToMedicationRecordRawValue({
      ...this.getFormDefaults(),
      ...(medicationRecord ?? { id: null }),
    });
    return new FormGroup<MedicationRecordFormGroupContent>({
      id: new FormControl(
        { value: medicationRecordRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      patientId: new FormControl(medicationRecordRawValue.patientId),
      occurredAt: new FormControl(medicationRecordRawValue.occurredAt),
      label: new FormControl(medicationRecordRawValue.label),
    });
  }

  getMedicationRecord(form: MedicationRecordFormGroup): IMedicationRecord | NewMedicationRecord {
    return this.convertMedicationRecordRawValueToMedicationRecord(form.getRawValue());
  }

  resetForm(form: MedicationRecordFormGroup, medicationRecord: MedicationRecordFormGroupInput): void {
    const medicationRecordRawValue = this.convertMedicationRecordToMedicationRecordRawValue({
      ...this.getFormDefaults(),
      ...medicationRecord,
    });
    form.reset(medicationRecordRawValue);
  }

  private getFormDefaults(): MedicationRecordFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      occurredAt: currentTime,
    };
  }

  private convertMedicationRecordRawValueToMedicationRecord(
    rawMedicationRecord: MedicationRecordFormRawValue | NewMedicationRecordFormRawValue,
  ): IMedicationRecord | NewMedicationRecord {
    return {
      ...rawMedicationRecord,
      occurredAt: dayjs(rawMedicationRecord.occurredAt, DATE_TIME_FORMAT),
    };
  }

  private convertMedicationRecordToMedicationRecordRawValue(
    medicationRecord: IMedicationRecord | (Partial<NewMedicationRecord> & MedicationRecordFormDefaults),
  ): MedicationRecordFormRawValue | PartialWithRequiredKeyOf<NewMedicationRecordFormRawValue> {
    return {
      ...medicationRecord,
      occurredAt: medicationRecord.occurredAt ? medicationRecord.occurredAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
