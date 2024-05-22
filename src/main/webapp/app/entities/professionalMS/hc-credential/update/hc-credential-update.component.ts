import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import SharedModule from 'app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IHCCredential } from '../hc-credential.model';
import { HCCredentialService } from '../service/hc-credential.service';
import { HCCredentialFormService, HCCredentialFormGroup } from './hc-credential-form.service';

@Component({
  standalone: true,
  selector: 'hpd-hc-credential-update',
  templateUrl: './hc-credential-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class HCCredentialUpdateComponent implements OnInit {
  isSaving = false;
  hCCredential: IHCCredential | null = null;

  editForm: HCCredentialFormGroup = this.hCCredentialFormService.createHCCredentialFormGroup();

  constructor(
    protected hCCredentialService: HCCredentialService,
    protected hCCredentialFormService: HCCredentialFormService,
    protected activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ hCCredential }) => {
      this.hCCredential = hCCredential;
      if (hCCredential) {
        this.updateForm(hCCredential);
      }
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const hCCredential = this.hCCredentialFormService.getHCCredential(this.editForm);
    if (hCCredential.id !== null) {
      this.subscribeToSaveResponse(this.hCCredentialService.update(hCCredential));
    } else {
      this.subscribeToSaveResponse(this.hCCredentialService.create(hCCredential));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IHCCredential>>): void {
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

  protected updateForm(hCCredential: IHCCredential): void {
    this.hCCredential = hCCredential;
    this.hCCredentialFormService.resetForm(this.editForm, hCCredential);
  }
}
