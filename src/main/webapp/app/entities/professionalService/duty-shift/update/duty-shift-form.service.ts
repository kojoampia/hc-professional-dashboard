import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IDutyShift, NewDutyShift } from '../duty-shift.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IDutyShift for edit and NewDutyShiftFormGroupInput for create.
 */
type DutyShiftFormGroupInput = IDutyShift | PartialWithRequiredKeyOf<NewDutyShift>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IDutyShift | NewDutyShift> = Omit<T, 'startsAt' | 'endsAt'> & {
  startsAt?: string | null;
  endsAt?: string | null;
};

type DutyShiftFormRawValue = FormValueOf<IDutyShift>;

type NewDutyShiftFormRawValue = FormValueOf<NewDutyShift>;

type DutyShiftFormDefaults = Pick<NewDutyShift, 'id' | 'startsAt' | 'endsAt'>;

type DutyShiftFormGroupContent = {
  id: FormControl<DutyShiftFormRawValue['id'] | NewDutyShift['id']>;
  professionalId: FormControl<DutyShiftFormRawValue['professionalId']>;
  startsAt: FormControl<DutyShiftFormRawValue['startsAt']>;
  endsAt: FormControl<DutyShiftFormRawValue['endsAt']>;
  status: FormControl<DutyShiftFormRawValue['status']>;
  roster: FormControl<DutyShiftFormRawValue['roster']>;
};

export type DutyShiftFormGroup = FormGroup<DutyShiftFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class DutyShiftFormService {
  createDutyShiftFormGroup(dutyShift?: DutyShiftFormGroupInput): DutyShiftFormGroup {
    const dutyShiftRawValue = this.convertDutyShiftToDutyShiftRawValue({
      ...this.getFormDefaults(),
      ...(dutyShift ?? { id: null }),
    });
    return new FormGroup<DutyShiftFormGroupContent>({
      id: new FormControl(
        { value: dutyShiftRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      professionalId: new FormControl(dutyShiftRawValue.professionalId),
      startsAt: new FormControl(dutyShiftRawValue.startsAt),
      endsAt: new FormControl(dutyShiftRawValue.endsAt),
      status: new FormControl(dutyShiftRawValue.status),
      roster: new FormControl(dutyShiftRawValue.roster),
    });
  }

  getDutyShift(form: DutyShiftFormGroup): IDutyShift | NewDutyShift {
    return this.convertDutyShiftRawValueToDutyShift(form.getRawValue());
  }

  resetForm(form: DutyShiftFormGroup, dutyShift: DutyShiftFormGroupInput): void {
    const dutyShiftRawValue = this.convertDutyShiftToDutyShiftRawValue({ ...this.getFormDefaults(), ...dutyShift });
    form.reset(dutyShiftRawValue);
  }

  private getFormDefaults(): DutyShiftFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      startsAt: currentTime,
      endsAt: currentTime,
    };
  }

  private convertDutyShiftRawValueToDutyShift(rawDutyShift: DutyShiftFormRawValue | NewDutyShiftFormRawValue): IDutyShift | NewDutyShift {
    return {
      ...rawDutyShift,
      startsAt: dayjs(rawDutyShift.startsAt, DATE_TIME_FORMAT),
      endsAt: dayjs(rawDutyShift.endsAt, DATE_TIME_FORMAT),
    };
  }

  private convertDutyShiftToDutyShiftRawValue(
    dutyShift: IDutyShift | (Partial<NewDutyShift> & DutyShiftFormDefaults),
  ): DutyShiftFormRawValue | PartialWithRequiredKeyOf<NewDutyShiftFormRawValue> {
    return {
      ...dutyShift,
      startsAt: dutyShift.startsAt ? dutyShift.startsAt.format(DATE_TIME_FORMAT) : undefined,
      endsAt: dutyShift.endsAt ? dutyShift.endsAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
