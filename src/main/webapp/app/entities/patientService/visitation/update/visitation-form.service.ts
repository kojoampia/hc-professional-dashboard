import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IVisitation, NewVisitation } from '../visitation.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IVisitation for edit and NewVisitationFormGroupInput for create.
 */
type VisitationFormGroupInput = IVisitation | PartialWithRequiredKeyOf<NewVisitation>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IVisitation | NewVisitation> = Omit<T, 'occurredAt'> & {
  occurredAt?: string | null;
};

type VisitationFormRawValue = FormValueOf<IVisitation>;

type NewVisitationFormRawValue = FormValueOf<NewVisitation>;

type VisitationFormDefaults = Pick<NewVisitation, 'id' | 'occurredAt'>;

type VisitationFormGroupContent = {
  id: FormControl<VisitationFormRawValue['id'] | NewVisitation['id']>;
  patientId: FormControl<VisitationFormRawValue['patientId']>;
  occurredAt: FormControl<VisitationFormRawValue['occurredAt']>;
  label: FormControl<VisitationFormRawValue['label']>;
};

export type VisitationFormGroup = FormGroup<VisitationFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class VisitationFormService {
  createVisitationFormGroup(visitation?: VisitationFormGroupInput): VisitationFormGroup {
    const visitationRawValue = this.convertVisitationToVisitationRawValue({
      ...this.getFormDefaults(),
      ...(visitation ?? { id: null }),
    });
    return new FormGroup<VisitationFormGroupContent>({
      id: new FormControl(
        { value: visitationRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      patientId: new FormControl(visitationRawValue.patientId),
      occurredAt: new FormControl(visitationRawValue.occurredAt),
      label: new FormControl(visitationRawValue.label),
    });
  }

  getVisitation(form: VisitationFormGroup): IVisitation | NewVisitation {
    return this.convertVisitationRawValueToVisitation(form.getRawValue());
  }

  resetForm(form: VisitationFormGroup, visitation: VisitationFormGroupInput): void {
    const visitationRawValue = this.convertVisitationToVisitationRawValue({ ...this.getFormDefaults(), ...visitation });
    form.reset(visitationRawValue);
  }

  private getFormDefaults(): VisitationFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      occurredAt: currentTime,
    };
  }

  private convertVisitationRawValueToVisitation(
    rawVisitation: VisitationFormRawValue | NewVisitationFormRawValue,
  ): IVisitation | NewVisitation {
    return {
      ...rawVisitation,
      occurredAt: dayjs(rawVisitation.occurredAt, DATE_TIME_FORMAT),
    };
  }

  private convertVisitationToVisitationRawValue(
    visitation: IVisitation | (Partial<NewVisitation> & VisitationFormDefaults),
  ): VisitationFormRawValue | PartialWithRequiredKeyOf<NewVisitationFormRawValue> {
    return {
      ...visitation,
      occurredAt: visitation.occurredAt ? visitation.occurredAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
