import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import SharedModule from 'app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IHCPayOption } from '../hc-pay-option.model';
import { HCPayOptionService } from '../service/hc-pay-option.service';
import { HCPayOptionFormService, HCPayOptionFormGroup } from './hc-pay-option-form.service';

@Component({
  standalone: true,
  selector: 'hpd-hc-pay-option-update',
  templateUrl: './hc-pay-option-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class HCPayOptionUpdateComponent implements OnInit {
  isSaving = false;
  hCPayOption: IHCPayOption | null = null;

  editForm: HCPayOptionFormGroup = this.hCPayOptionFormService.createHCPayOptionFormGroup();

  constructor(
    protected hCPayOptionService: HCPayOptionService,
    protected hCPayOptionFormService: HCPayOptionFormService,
    protected activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ hCPayOption }) => {
      this.hCPayOption = hCPayOption;
      if (hCPayOption) {
        this.updateForm(hCPayOption);
      }
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const hCPayOption = this.hCPayOptionFormService.getHCPayOption(this.editForm);
    if (hCPayOption.id !== null) {
      this.subscribeToSaveResponse(this.hCPayOptionService.update(hCPayOption));
    } else {
      this.subscribeToSaveResponse(this.hCPayOptionService.create(hCPayOption));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IHCPayOption>>): void {
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

  protected updateForm(hCPayOption: IHCPayOption): void {
    this.hCPayOption = hCPayOption;
    this.hCPayOptionFormService.resetForm(this.editForm, hCPayOption);
  }
}
