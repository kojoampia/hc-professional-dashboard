import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IReport } from '../report.model';
import { ReportService } from '../service/report.service';

import { ReportFormGroup, ReportFormService } from './report-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-report-update',
  templateUrl: './report-update.html',
  imports: [TranslateDirective, TranslateModule, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class ReportUpdate implements OnInit {
  readonly isSaving = signal(false);
  report: IReport | null = null;

  protected reportService = inject(ReportService);
  protected reportFormService = inject(ReportFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ReportFormGroup = this.reportFormService.createReportFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ report }) => {
      this.report = report;
      if (report) {
        this.updateForm(report);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const report = this.reportFormService.getReport(this.editForm);
    if (report.id === null) {
      this.subscribeToSaveResponse(this.reportService.create(report));
    } else {
      this.subscribeToSaveResponse(this.reportService.update(report));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IReport | null>): void {
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

  protected updateForm(report: IReport): void {
    this.report = report;
    this.reportFormService.resetForm(this.editForm, report);
  }
}
