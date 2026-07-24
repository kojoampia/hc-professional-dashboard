import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IMedCase } from '../med-case.model';
import { MedCaseService } from '../service/med-case.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './med-case-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, MatIconModule, AlertErrorComponent],
})
export class MedCaseDeleteDialogComponent {
  medCase?: IMedCase;

  protected readonly medCaseService = inject(MedCaseService);
  protected readonly activeModal = inject(NgbActiveModal);

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: string): void {
    this.medCaseService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
