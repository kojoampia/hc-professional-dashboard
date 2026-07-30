import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IRecommendation } from '../recommendation.model';
import { RecommendationService } from '../service/recommendation.service';

import { RecommendationFormGroup, RecommendationFormService } from './recommendation-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-recommendation-update',
  templateUrl: './recommendation-update.html',
  imports: [TranslateDirective, TranslateModule, AlertErrorComponent, ReactiveFormsModule, MatIconModule],
})
export class RecommendationUpdateComponent implements OnInit {
  readonly isSaving = signal(false);
  recommendation: IRecommendation | null = null;

  protected recommendationService = inject(RecommendationService);
  protected recommendationFormService = inject(RecommendationFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: RecommendationFormGroup = this.recommendationFormService.createRecommendationFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ recommendation }) => {
      this.recommendation = recommendation;
      if (recommendation) {
        this.updateForm(recommendation);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const recommendation = this.recommendationFormService.getRecommendation(this.editForm);
    if (recommendation.id === null) {
      this.subscribeToSaveResponse(this.recommendationService.create(recommendation));
    } else {
      this.subscribeToSaveResponse(this.recommendationService.update(recommendation));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IRecommendation | null>): void {
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

  protected updateForm(recommendation: IRecommendation): void {
    this.recommendation = recommendation;
    this.recommendationFormService.resetForm(this.editForm, recommendation);
  }
}
