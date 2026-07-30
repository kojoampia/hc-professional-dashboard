import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IActivityLogEntry, NewActivityLogEntry } from '../activity-log-entry.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IActivityLogEntry for edit and NewActivityLogEntryFormGroupInput for create.
 */
type ActivityLogEntryFormGroupInput = IActivityLogEntry | PartialWithRequiredKeyOf<NewActivityLogEntry>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IActivityLogEntry | NewActivityLogEntry> = Omit<T, 'occurredAt' | 'createdAt'> & {
  occurredAt?: string | null;
  createdAt?: string | null;
};

type ActivityLogEntryFormRawValue = FormValueOf<IActivityLogEntry>;

type NewActivityLogEntryFormRawValue = FormValueOf<NewActivityLogEntry>;

type ActivityLogEntryFormDefaults = Pick<NewActivityLogEntry, 'id' | 'occurredAt' | 'createdAt'>;

type ActivityLogEntryFormGroupContent = {
  id: FormControl<ActivityLogEntryFormRawValue['id'] | NewActivityLogEntry['id']>;
  patientId: FormControl<ActivityLogEntryFormRawValue['patientId']>;
  occurredAt: FormControl<ActivityLogEntryFormRawValue['occurredAt']>;
  label: FormControl<ActivityLogEntryFormRawValue['label']>;
  title: FormControl<ActivityLogEntryFormRawValue['title']>;
  description: FormControl<ActivityLogEntryFormRawValue['description']>;
  createdAt: FormControl<ActivityLogEntryFormRawValue['createdAt']>;
};

export type ActivityLogEntryFormGroup = FormGroup<ActivityLogEntryFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ActivityLogEntryFormService {
  createActivityLogEntryFormGroup(activityLogEntry?: ActivityLogEntryFormGroupInput): ActivityLogEntryFormGroup {
    const activityLogEntryRawValue = this.convertActivityLogEntryToActivityLogEntryRawValue({
      ...this.getFormDefaults(),
      ...(activityLogEntry ?? { id: null }),
    });
    return new FormGroup<ActivityLogEntryFormGroupContent>({
      id: new FormControl(
        { value: activityLogEntryRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      patientId: new FormControl(activityLogEntryRawValue.patientId),
      occurredAt: new FormControl(activityLogEntryRawValue.occurredAt),
      label: new FormControl(activityLogEntryRawValue.label),
      title: new FormControl(activityLogEntryRawValue.title),
      description: new FormControl(activityLogEntryRawValue.description),
      createdAt: new FormControl(activityLogEntryRawValue.createdAt),
    });
  }

  getActivityLogEntry(form: ActivityLogEntryFormGroup): IActivityLogEntry | NewActivityLogEntry {
    return this.convertActivityLogEntryRawValueToActivityLogEntry(form.getRawValue());
  }

  resetForm(form: ActivityLogEntryFormGroup, activityLogEntry: ActivityLogEntryFormGroupInput): void {
    const activityLogEntryRawValue = this.convertActivityLogEntryToActivityLogEntryRawValue({
      ...this.getFormDefaults(),
      ...activityLogEntry,
    });
    form.reset(activityLogEntryRawValue);
  }

  private getFormDefaults(): ActivityLogEntryFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      occurredAt: currentTime,
      createdAt: currentTime,
    };
  }

  private convertActivityLogEntryRawValueToActivityLogEntry(
    rawActivityLogEntry: ActivityLogEntryFormRawValue | NewActivityLogEntryFormRawValue,
  ): IActivityLogEntry | NewActivityLogEntry {
    return {
      ...rawActivityLogEntry,
      occurredAt: dayjs(rawActivityLogEntry.occurredAt, DATE_TIME_FORMAT),
      createdAt: dayjs(rawActivityLogEntry.createdAt, DATE_TIME_FORMAT),
    };
  }

  private convertActivityLogEntryToActivityLogEntryRawValue(
    activityLogEntry: IActivityLogEntry | (Partial<NewActivityLogEntry> & ActivityLogEntryFormDefaults),
  ): ActivityLogEntryFormRawValue | PartialWithRequiredKeyOf<NewActivityLogEntryFormRawValue> {
    return {
      ...activityLogEntry,
      occurredAt: activityLogEntry.occurredAt ? activityLogEntry.occurredAt.format(DATE_TIME_FORMAT) : undefined,
      createdAt: activityLogEntry.createdAt ? activityLogEntry.createdAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
