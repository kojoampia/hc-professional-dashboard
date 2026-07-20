import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IMedication } from '../medication.model';
import { MedicationService } from '../service/medication.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medication-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, FontAwesomeModule, AlertError],
})
export class MedicationDeleteDialog {
  medication?: IMedication;

  protected readonly medicationService = inject(MedicationService);
  protected readonly activeModal = inject(NgbActiveModal);

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: string): void {
    this.medicationService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
