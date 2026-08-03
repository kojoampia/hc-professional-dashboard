import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { DataUtils, FileLoadError } from 'app/core/util/data-util.service';
import { EventManager, EventWithContent } from 'app/core/util/event-manager.service';
import { DocumentType } from 'app/entities/enumerations/document-type.model';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { AlertError } from 'app/shared/alert/alert-error.model';
import { TranslateDirective } from 'app/shared/language';
import { IDocument } from '../document.model';
import { DocumentService } from '../service/document.service';

import { DocumentFormGroup, DocumentFormService } from './document-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-document-update',
  templateUrl: './document-update.html',
  imports: [TranslateDirective, TranslateModule, AlertErrorComponent, ReactiveFormsModule, MatIconModule],
})
export class DocumentUpdateComponent implements OnInit {
  readonly isSaving = signal(false);
  document: IDocument | null = null;
  documentTypeValues = Object.keys(DocumentType);

  protected dataUtils = inject(DataUtils);
  protected eventManager = inject(EventManager);
  protected documentService = inject(DocumentService);
  protected documentFormService = inject(DocumentFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: DocumentFormGroup = this.documentFormService.createDocumentFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ document }) => {
      this.document = document;
      if (document) {
        this.updateForm(document);
      }
    });
  }

  byteSize(base64String: string): string {
    return this.dataUtils.byteSize(base64String);
  }

  openFile(base64String: string, contentType: string | null | undefined): void {
    this.dataUtils.openFile(base64String, contentType);
  }

  setFileData(event: Event, field: string, isImage: boolean): void {
    this.dataUtils.loadFileToForm(event, this.editForm, field, isImage).subscribe({
      error: (err: FileLoadError) =>
        this.eventManager.broadcast(
          new EventWithContent<AlertError>('professionalDashboardApp.error', { ...err, key: `error.file.${err.key}` }),
        ),
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const document = this.documentFormService.getDocument(this.editForm);
    if (document.id === null) {
      this.subscribeToSaveResponse(this.documentService.create(document));
    } else {
      this.subscribeToSaveResponse(this.documentService.update(document));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IDocument | null>): void {
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

  protected updateForm(document: IDocument): void {
    this.document = document;
    this.documentFormService.resetForm(this.editForm, document);
  }
}
