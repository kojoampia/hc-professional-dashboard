import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import SharedModule from 'app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ICondition } from '../condition.model';
import { ConditionService } from '../service/condition.service';
import { ConditionFormService, ConditionFormGroup } from './condition-form.service';

@Component({
  standalone: true,
  selector: 'hpd-condition-update',
  templateUrl: './condition-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class ConditionUpdateComponent implements OnInit {
  isSaving = false;
  condition: ICondition | null = null;

  editForm: ConditionFormGroup = this.conditionFormService.createConditionFormGroup();

  constructor(
    protected conditionService: ConditionService,
    protected conditionFormService: ConditionFormService,
    protected activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ condition }) => {
      this.condition = condition;
      if (condition) {
        this.updateForm(condition);
      }
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const condition = this.conditionFormService.getCondition(this.editForm);
    if (condition.id !== null) {
      this.subscribeToSaveResponse(this.conditionService.update(condition));
    } else {
      this.subscribeToSaveResponse(this.conditionService.create(condition));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<ICondition>>): void {
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

  protected updateForm(condition: ICondition): void {
    this.condition = condition;
    this.conditionFormService.resetForm(this.editForm, condition);
  }
}
