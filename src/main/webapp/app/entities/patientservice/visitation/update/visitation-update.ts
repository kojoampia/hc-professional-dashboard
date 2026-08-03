import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { VisitationService } from '../service/visitation.service';
import { IVisitation } from '../visitation.model';

import { VisitationFormGroup, VisitationFormService } from './visitation-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-visitation-update',
  templateUrl: './visitation-update.html',
  imports: [TranslateDirective, TranslateModule, AlertErrorComponent, ReactiveFormsModule, MatIconModule],
})
export class VisitationUpdateComponent implements OnInit {
  readonly isSaving = signal(false);
  visitation: IVisitation | null = null;

  protected visitationService = inject(VisitationService);
  protected visitationFormService = inject(VisitationFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: VisitationFormGroup = this.visitationFormService.createVisitationFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ visitation }) => {
      this.visitation = visitation;
      if (visitation) {
        this.updateForm(visitation);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const visitation = this.visitationFormService.getVisitation(this.editForm);
    if (visitation.id === null) {
      this.subscribeToSaveResponse(this.visitationService.create(visitation));
    } else {
      this.subscribeToSaveResponse(this.visitationService.update(visitation));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IVisitation | null>): void {
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

  protected updateForm(visitation: IVisitation): void {
    this.visitation = visitation;
    this.visitationFormService.resetForm(this.editForm, visitation);
  }
}
