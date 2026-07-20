import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IMedCase } from '../med-case.model';
import { MedCaseService } from '../service/med-case.service';

import { MedCaseFormGroup, MedCaseFormService } from './med-case-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-med-case-update',
  templateUrl: './med-case-update.html',
  imports: [TranslateDirective, TranslateModule, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class MedCaseUpdate implements OnInit {
  readonly isSaving = signal(false);
  medCase: IMedCase | null = null;

  protected medCaseService = inject(MedCaseService);
  protected medCaseFormService = inject(MedCaseFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: MedCaseFormGroup = this.medCaseFormService.createMedCaseFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ medCase }) => {
      this.medCase = medCase;
      if (medCase) {
        this.updateForm(medCase);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const medCase = this.medCaseFormService.getMedCase(this.editForm);
    if (medCase.id === null) {
      this.subscribeToSaveResponse(this.medCaseService.create(medCase));
    } else {
      this.subscribeToSaveResponse(this.medCaseService.update(medCase));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IMedCase | null>): void {
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

  protected updateForm(medCase: IMedCase): void {
    this.medCase = medCase;
    this.medCaseFormService.resetForm(this.editForm, medCase);
  }
}
