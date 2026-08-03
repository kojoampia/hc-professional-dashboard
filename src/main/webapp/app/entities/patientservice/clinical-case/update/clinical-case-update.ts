import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { CaseStatus } from 'app/entities/enumerations/case-status.model';
import { IRecommendation } from 'app/entities/patientservice/recommendation/recommendation.model';
import { RecommendationService } from 'app/entities/patientservice/recommendation/service/recommendation.service';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IClinicalCase } from '../clinical-case.model';
import { ClinicalCaseService } from '../service/clinical-case.service';

import { ClinicalCaseFormGroup, ClinicalCaseFormService } from './clinical-case-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-clinical-case-update',
  templateUrl: './clinical-case-update.html',
  imports: [TranslateDirective, TranslateModule, AlertErrorComponent, ReactiveFormsModule, MatIconModule],
})
export class ClinicalCaseUpdateComponent implements OnInit {
  readonly isSaving = signal(false);
  clinicalCase: IClinicalCase | null = null;
  caseStatusValues = Object.keys(CaseStatus);

  recommendationsSharedCollection = signal<IRecommendation[]>([]);

  protected clinicalCaseService = inject(ClinicalCaseService);
  protected clinicalCaseFormService = inject(ClinicalCaseFormService);
  protected recommendationService = inject(RecommendationService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ClinicalCaseFormGroup = this.clinicalCaseFormService.createClinicalCaseFormGroup();

  compareRecommendation = (o1: IRecommendation | null, o2: IRecommendation | null): boolean =>
    this.recommendationService.compareRecommendation(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ clinicalCase }) => {
      this.clinicalCase = clinicalCase;
      if (clinicalCase) {
        this.updateForm(clinicalCase);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const clinicalCase = this.clinicalCaseFormService.getClinicalCase(this.editForm);
    if (clinicalCase.id === null) {
      this.subscribeToSaveResponse(this.clinicalCaseService.create(clinicalCase));
    } else {
      this.subscribeToSaveResponse(this.clinicalCaseService.update(clinicalCase));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IClinicalCase | null>): void {
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

  protected updateForm(clinicalCase: IClinicalCase): void {
    this.clinicalCase = clinicalCase;
    this.clinicalCaseFormService.resetForm(this.editForm, clinicalCase);

    this.recommendationsSharedCollection.update(recommendations =>
      this.recommendationService.addRecommendationToCollectionIfMissing<IRecommendation>(
        recommendations,
        ...(clinicalCase.recommendations ?? []),
      ),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.recommendationService
      .query()
      .pipe(map((res: HttpResponse<IRecommendation[]>) => res.body ?? []))
      .pipe(
        map((recommendations: IRecommendation[]) =>
          this.recommendationService.addRecommendationToCollectionIfMissing<IRecommendation>(
            recommendations,
            ...(this.clinicalCase?.recommendations ?? []),
          ),
        ),
      )
      .subscribe((recommendations: IRecommendation[]) => this.recommendationsSharedCollection.set(recommendations));
  }
}
