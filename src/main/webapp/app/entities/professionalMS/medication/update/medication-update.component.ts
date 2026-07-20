import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import SharedModule from 'app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IMedication } from '../medication.model';
import { MedicationService } from '../service/medication.service';
import { MedicationFormService, MedicationFormGroup } from './medication-form.service';

@Component({
    selector: 'hpd-medication-update',
    templateUrl: './medication-update.component.html',
    imports: [SharedModule, FormsModule, ReactiveFormsModule]
})
export class MedicationUpdateComponent implements OnInit {
  isSaving = false;
  medication: IMedication | null = null;

  editForm: MedicationFormGroup = this.medicationFormService.createMedicationFormGroup();

  constructor(
    protected medicationService: MedicationService,
    protected medicationFormService: MedicationFormService,
    protected activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ medication }) => {
      this.medication = medication;
      if (medication) {
        this.updateForm(medication);
      }
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const medication = this.medicationFormService.getMedication(this.editForm);
    if (medication.id !== null) {
      this.subscribeToSaveResponse(this.medicationService.update(medication));
    } else {
      this.subscribeToSaveResponse(this.medicationService.create(medication));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IMedication>>): void {
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
    this.isSaving = false;
  }

  protected updateForm(medication: IMedication): void {
    this.medication = medication;
    this.medicationFormService.resetForm(this.editForm, medication);
  }
}
