import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IMedicationRecord } from '../medication-record.model';
import { MedicationRecordService } from '../service/medication-record.service';

import { MedicationRecordFormGroup, MedicationRecordFormService } from './medication-record-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-medication-record-update',
  templateUrl: './medication-record-update.html',
  imports: [TranslateDirective, TranslateModule, AlertErrorComponent, ReactiveFormsModule, MatIconModule],
})
export class MedicationRecordUpdateComponent implements OnInit {
  readonly isSaving = signal(false);
  medicationRecord: IMedicationRecord | null = null;

  protected medicationRecordService = inject(MedicationRecordService);
  protected medicationRecordFormService = inject(MedicationRecordFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: MedicationRecordFormGroup = this.medicationRecordFormService.createMedicationRecordFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ medicationRecord }) => {
      this.medicationRecord = medicationRecord;
      if (medicationRecord) {
        this.updateForm(medicationRecord);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const medicationRecord = this.medicationRecordFormService.getMedicationRecord(this.editForm);
    if (medicationRecord.id === null) {
      this.subscribeToSaveResponse(this.medicationRecordService.create(medicationRecord));
    } else {
      this.subscribeToSaveResponse(this.medicationRecordService.update(medicationRecord));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IMedicationRecord | null>): void {
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

  protected updateForm(medicationRecord: IMedicationRecord): void {
    this.medicationRecord = medicationRecord;
    this.medicationRecordFormService.resetForm(this.editForm, medicationRecord);
  }
}
