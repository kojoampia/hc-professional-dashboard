import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';

import { DATE_TIME_FORMAT } from 'app/config/input.constants';
import { IClinicalReport, NewClinicalReport } from '../clinical-report.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IClinicalReport for edit and NewClinicalReportFormGroupInput for create.
 */
type ClinicalReportFormGroupInput = IClinicalReport | PartialWithRequiredKeyOf<NewClinicalReport>;

/**
 * Type that converts some properties for forms.
 */
type FormValueOf<T extends IClinicalReport | NewClinicalReport> = Omit<T, 'occurredAt'> & {
  occurredAt?: string | null;
};

type ClinicalReportFormRawValue = FormValueOf<IClinicalReport>;

type NewClinicalReportFormRawValue = FormValueOf<NewClinicalReport>;

type ClinicalReportFormDefaults = Pick<NewClinicalReport, 'id' | 'occurredAt'>;

type ClinicalReportFormGroupContent = {
  id: FormControl<ClinicalReportFormRawValue['id'] | NewClinicalReport['id']>;
  patientId: FormControl<ClinicalReportFormRawValue['patientId']>;
  occurredAt: FormControl<ClinicalReportFormRawValue['occurredAt']>;
  label: FormControl<ClinicalReportFormRawValue['label']>;
  reportType: FormControl<ClinicalReportFormRawValue['reportType']>;
  url: FormControl<ClinicalReportFormRawValue['url']>;
};

export type ClinicalReportFormGroup = FormGroup<ClinicalReportFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class ClinicalReportFormService {
  createClinicalReportFormGroup(clinicalReport?: ClinicalReportFormGroupInput): ClinicalReportFormGroup {
    const clinicalReportRawValue = this.convertClinicalReportToClinicalReportRawValue({
      ...this.getFormDefaults(),
      ...(clinicalReport ?? { id: null }),
    });
    return new FormGroup<ClinicalReportFormGroupContent>({
      id: new FormControl(
        { value: clinicalReportRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      patientId: new FormControl(clinicalReportRawValue.patientId),
      occurredAt: new FormControl(clinicalReportRawValue.occurredAt),
      label: new FormControl(clinicalReportRawValue.label),
      reportType: new FormControl(clinicalReportRawValue.reportType),
      url: new FormControl(clinicalReportRawValue.url),
    });
  }

  getClinicalReport(form: ClinicalReportFormGroup): IClinicalReport | NewClinicalReport {
    return this.convertClinicalReportRawValueToClinicalReport(form.getRawValue());
  }

  resetForm(form: ClinicalReportFormGroup, clinicalReport: ClinicalReportFormGroupInput): void {
    const clinicalReportRawValue = this.convertClinicalReportToClinicalReportRawValue({ ...this.getFormDefaults(), ...clinicalReport });
    form.reset(clinicalReportRawValue);
  }

  private getFormDefaults(): ClinicalReportFormDefaults {
    const currentTime = dayjs();

    return {
      id: null,
      occurredAt: currentTime,
    };
  }

  private convertClinicalReportRawValueToClinicalReport(
    rawClinicalReport: ClinicalReportFormRawValue | NewClinicalReportFormRawValue,
  ): IClinicalReport | NewClinicalReport {
    return {
      ...rawClinicalReport,
      occurredAt: dayjs(rawClinicalReport.occurredAt, DATE_TIME_FORMAT),
    };
  }

  private convertClinicalReportToClinicalReportRawValue(
    clinicalReport: IClinicalReport | (Partial<NewClinicalReport> & ClinicalReportFormDefaults),
  ): ClinicalReportFormRawValue | PartialWithRequiredKeyOf<NewClinicalReportFormRawValue> {
    return {
      ...clinicalReport,
      occurredAt: clinicalReport.occurredAt ? clinicalReport.occurredAt.format(DATE_TIME_FORMAT) : undefined,
    };
  }
}
