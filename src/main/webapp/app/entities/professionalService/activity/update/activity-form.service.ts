import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IActivity, NewActivity } from '../activity.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IActivity for edit and NewActivityFormGroupInput for create.
 */
type ActivityFormGroupInput = IActivity | PartialWithRequiredKeyOf<NewActivity>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IActivity | NewActivity> = Omit<T, 'createdDate' | 'modifiedDate'> & {
  createdDate?: string | null;
  modifiedDate?: string | null;
};

type ActivityFormRawValue = FormValueOf<IActivity>;

type NewActivityFormRawValue = FormValueOf<NewActivity>;

type ActivityFormDefaults = Pick<NewActivity, 'id' | 'createdDate' | 'modifiedDate'>;

type ActivityFormGroupContent = {
  id: FormControl<ActivityFormRawValue['id'] | NewActivity['id']>;
  name: FormControl<ActivityFormRawValue['name']>;
  description: FormControl<ActivityFormRawValue['description']>;
  patientId: FormControl<ActivityFormRawValue['patientId']>;
  createdDate: FormControl<ActivityFormRawValue['createdDate']>;
  createdBy: FormControl<ActivityFormRawValue['createdBy']>;
  modifiedDate: FormControl<ActivityFormRawValue['modifiedDate']>;
  modifiedBy: FormControl<ActivityFormRawValue['modifiedBy']>;
};

export type ActivityFormGroup = FormGroup<ActivityFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ActivityFormService {
  createActivityFormGroup(activity?: ActivityFormGroupInput): ActivityFormGroup {
    const activityRawValue = this.convertActivityToActivityRawValue({
      ...this.getFormDefaults(),
      ...(activity ?? { id: null }),
    });
    return new FormGroup<ActivityFormGroupContent>({
      id: new FormControl(
        { value: activityRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(activityRawValue.name),
      description: new FormControl(activityRawValue.description),
      patientId: new FormControl(activityRawValue.patientId),
      createdDate: new FormControl(activityRawValue.createdDate),
      createdBy: new FormControl(activityRawValue.createdBy),
      modifiedDate: new FormControl(activityRawValue.modifiedDate),
      modifiedBy: new FormControl(activityRawValue.modifiedBy),
    });
  }

  getActivity(form: ActivityFormGroup): IActivity | NewActivity {
    return this.convertActivityRawValueToActivity(form.getRawValue());
  }

  resetForm(form: ActivityFormGroup, activity: ActivityFormGroupInput): void {
    const activityRawValue = this.convertActivityToActivityRawValue({ ...this.getFormDefaults(), ...activity });
    form.reset({
      ...activityRawValue,
      id: { value: activityRawValue.id, disabled: true },
    });
  }

  private getFormDefaults(): ActivityFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      createdDate: currentTime,
      modifiedDate: currentTime,
    };
  }

  private convertActivityRawValueToActivity(rawActivity: ActivityFormRawValue | NewActivityFormRawValue): IActivity | NewActivity {
    return {
      ...rawActivity,
      createdDate: dayjs(rawActivity.createdDate, DATE_TIME_FORMAT),
      modifiedDate: dayjs(rawActivity.modifiedDate, DATE_TIME_FORMAT),
    };
  }

  private convertActivityToActivityRawValue(
    activity: IActivity | (Partial<NewActivity> & ActivityFormDefaults),
  ): ActivityFormRawValue | PartialWithRequiredKeyOf<NewActivityFormRawValue> {
    return {
      ...activity,
      createdDate: activity.createdDate ? activity.createdDate.format(DATE_TIME_FORMAT) : undefined,
      modifiedDate: activity.modifiedDate ? activity.modifiedDate.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
