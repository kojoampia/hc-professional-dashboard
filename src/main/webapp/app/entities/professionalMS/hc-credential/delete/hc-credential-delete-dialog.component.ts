import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'app/shared/shared.module';
import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { IHCCredential } from '../hc-credential.model';
import { HCCredentialService } from '../service/hc-credential.service';

@Component({
    templateUrl: './hc-credential-delete-dialog.component.html',
    imports: [SharedModule, FormsModule]
})
export class HCCredentialDeleteDialogComponent {
  hCCredential?: IHCCredential;

  constructor(
    protected hCCredentialService: HCCredentialService,
    protected activeModal: NgbActiveModal,
  ) {}

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: string): void {
    this.hCCredentialService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
