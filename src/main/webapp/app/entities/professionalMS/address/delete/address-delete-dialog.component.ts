import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'app/shared/shared.module';
import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { IAddress } from '../address.model';
import { AddressService } from '../service/address.service';

@Component({
  templateUrl: './address-delete-dialog.component.html',
  imports: [SharedModule, FormsModule],
})
export class AddressDeleteDialogComponent {
  address?: IAddress;

  constructor(
    protected addressService: AddressService,
    protected activeModal: NgbActiveModal,
  ) {}

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: string): void {
    this.addressService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
