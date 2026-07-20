import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IMetadata } from '../metadata.model';
import { MetadataService } from '../service/metadata.service';

import { MetadataFormGroup, MetadataFormService } from './metadata-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-metadata-update',
  templateUrl: './metadata-update.html',
  imports: [TranslateDirective, TranslateModule, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class MetadataUpdate implements OnInit {
  readonly isSaving = signal(false);
  metadata: IMetadata | null = null;

  protected metadataService = inject(MetadataService);
  protected metadataFormService = inject(MetadataFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: MetadataFormGroup = this.metadataFormService.createMetadataFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ metadata }) => {
      this.metadata = metadata;
      if (metadata) {
        this.updateForm(metadata);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const metadata = this.metadataFormService.getMetadata(this.editForm);
    if (metadata.id === null) {
      this.subscribeToSaveResponse(this.metadataService.create(metadata));
    } else {
      this.subscribeToSaveResponse(this.metadataService.update(metadata));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IMetadata | null>): void {
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

  protected updateForm(metadata: IMetadata): void {
    this.metadata = metadata;
    this.metadataFormService.resetForm(this.editForm, metadata);
  }
}
