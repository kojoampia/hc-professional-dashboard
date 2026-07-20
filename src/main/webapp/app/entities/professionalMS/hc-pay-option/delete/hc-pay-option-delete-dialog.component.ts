import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'app/shared/shared.module';
import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { IHCPayOption } from '../hc-pay-option.model';
import { HCPayOptionService } from '../service/hc-pay-option.service';

@Component({
  templateUrl: './hc-pay-option-delete-dialog.component.html',
  imports: [SharedModule, FormsModule],
})
export class HCPayOptionDeleteDialogComponent {
  hCPayOption?: IHCPayOption;

  constructor(
    protected hCPayOptionService: HCPayOptionService,
    protected activeModal: NgbActiveModal,
  ) {}

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: string): void {
    this.hCPayOptionService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
