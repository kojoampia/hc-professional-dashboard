import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import SharedModule from 'app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IStat } from '../stat.model';
import { StatService } from '../service/stat.service';
import { StatFormService, StatFormGroup } from './stat-form.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'jhi-stat-update',
  templateUrl: './stat-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule, TranslateModule],
})
export class StatUpdateComponent implements OnInit {
  isSaving = false;
  stat: IStat | null = null;

  editForm: StatFormGroup = this.statFormService.createStatFormGroup();

  constructor(
    protected statService: StatService,
    protected statFormService: StatFormService,
    protected activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ stat }) => {
      this.stat = stat;
      if (stat) {
        this.updateForm(stat);
      }
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const stat = this.statFormService.getStat(this.editForm);
    if (stat.id !== null) {
      this.subscribeToSaveResponse(this.statService.update(stat));
    } else {
      this.subscribeToSaveResponse(this.statService.create(stat));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IStat>>): void {
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

  protected updateForm(stat: IStat): void {
    this.stat = stat;
    this.statFormService.resetForm(this.editForm, stat);
  }
}
