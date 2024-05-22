import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import SharedModule from 'app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IMetadata } from '../metadata.model';
import { MetadataService } from '../service/metadata.service';
import { MetadataFormService, MetadataFormGroup } from './metadata-form.service';

@Component({
  standalone: true,
  selector: 'hpd-metadata-update',
  templateUrl: './metadata-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class MetadataUpdateComponent implements OnInit {
  isSaving = false;
  metadata: IMetadata | null = null;

  editForm: MetadataFormGroup = this.metadataFormService.createMetadataFormGroup();

  constructor(
    protected metadataService: MetadataService,
    protected metadataFormService: MetadataFormService,
    protected activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ metadata }) => {
      this.metadata = metadata;
      if (metadata) {
        this.updateForm(metadata);
      }
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const metadata = this.metadataFormService.getMetadata(this.editForm);
    if (metadata.id !== null) {
      this.subscribeToSaveResponse(this.metadataService.update(metadata));
    } else {
      this.subscribeToSaveResponse(this.metadataService.create(metadata));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IMetadata>>): void {
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

  protected updateForm(metadata: IMetadata): void {
    this.metadata = metadata;
    this.metadataFormService.resetForm(this.editForm, metadata);
  }
}
