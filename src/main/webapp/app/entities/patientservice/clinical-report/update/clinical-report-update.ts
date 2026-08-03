import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IClinicalReport } from '../clinical-report.model';
import { ClinicalReportService } from '../service/clinical-report.service';

import { ClinicalReportFormGroup, ClinicalReportFormService } from './clinical-report-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-clinical-report-update',
  templateUrl: './clinical-report-update.html',
  imports: [TranslateDirective, TranslateModule, AlertErrorComponent, ReactiveFormsModule, MatIconModule],
})
export class ClinicalReportUpdateComponent implements OnInit {
  readonly isSaving = signal(false);
  clinicalReport: IClinicalReport | null = null;

  protected clinicalReportService = inject(ClinicalReportService);
  protected clinicalReportFormService = inject(ClinicalReportFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ClinicalReportFormGroup = this.clinicalReportFormService.createClinicalReportFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ clinicalReport }) => {
      this.clinicalReport = clinicalReport;
      if (clinicalReport) {
        this.updateForm(clinicalReport);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const clinicalReport = this.clinicalReportFormService.getClinicalReport(this.editForm);
    if (clinicalReport.id === null) {
      this.subscribeToSaveResponse(this.clinicalReportService.create(clinicalReport));
    } else {
      this.subscribeToSaveResponse(this.clinicalReportService.update(clinicalReport));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IClinicalReport | null>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving.set(false);
  }

  protected updateForm(clinicalReport: IClinicalReport): void {
    this.clinicalReport = clinicalReport;
    this.clinicalReportFormService.resetForm(this.editForm, clinicalReport);
  }
}
