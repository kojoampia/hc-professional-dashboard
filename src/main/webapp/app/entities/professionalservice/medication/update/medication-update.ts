import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IMedication } from '../medication.model';
import { MedicationService } from '../service/medication.service';

import { MedicationFormGroup, MedicationFormService } from './medication-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-medication-update',
  templateUrl: './medication-update.html',
  imports: [TranslateDirective, TranslateModule, AlertErrorComponent, ReactiveFormsModule, MatIconModule],
})
export class MedicationUpdateComponent implements OnInit {
  readonly isSaving = signal(false);
  medication: IMedication | null = null;

  protected medicationService = inject(MedicationService);
  protected medicationFormService = inject(MedicationFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: MedicationFormGroup = this.medicationFormService.createMedicationFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ medication }) => {
      this.medication = medication;
      if (medication) {
        this.updateForm(medication);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const medication = this.medicationFormService.getMedication(this.editForm);
    if (medication.id === null) {
      this.subscribeToSaveResponse(this.medicationService.create(medication));
    } else {
      this.subscribeToSaveResponse(this.medicationService.update(medication));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IMedication | null>): void {
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

  protected updateForm(medication: IMedication): void {
    this.medication = medication;
    this.medicationFormService.resetForm(this.editForm, medication);
  }
}
