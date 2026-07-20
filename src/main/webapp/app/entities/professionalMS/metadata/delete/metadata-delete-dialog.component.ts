import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'app/shared/shared.module';
import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { IMetadata } from '../metadata.model';
import { MetadataService } from '../service/metadata.service';

@Component({
  templateUrl: './metadata-delete-dialog.component.html',
  imports: [SharedModule, FormsModule],
})
export class MetadataDeleteDialogComponent {
  metadata?: IMetadata;

  constructor(
    protected metadataService: MetadataService,
    protected activeModal: NgbActiveModal,
  ) {}

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: string): void {
    this.metadataService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
