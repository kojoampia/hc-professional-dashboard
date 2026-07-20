import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'app/shared/shared.module';
import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { IMedication } from '../medication.model';
import { MedicationService } from '../service/medication.service';

@Component({
  templateUrl: './medication-delete-dialog.component.html',
  imports: [SharedModule, FormsModule],
})
export class MedicationDeleteDialogComponent {
  medication?: IMedication;

  constructor(
    protected medicationService: MedicationService,
    protected activeModal: NgbActiveModal,
  ) {}

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: string): void {
    this.medicationService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
