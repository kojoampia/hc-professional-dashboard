import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IAddress } from '../address.model';
import { AddressService } from '../service/address.service';

import { AddressFormGroup, AddressFormService } from './address-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-address-update',
  templateUrl: './address-update.html',
  imports: [TranslateDirective, TranslateModule, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class AddressUpdate implements OnInit {
  readonly isSaving = signal(false);
  address: IAddress | null = null;

  protected addressService = inject(AddressService);
  protected addressFormService = inject(AddressFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: AddressFormGroup = this.addressFormService.createAddressFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ address }) => {
      this.address = address;
      if (address) {
        this.updateForm(address);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const address = this.addressFormService.getAddress(this.editForm);
    if (address.id === null) {
      this.subscribeToSaveResponse(this.addressService.create(address));
    } else {
      this.subscribeToSaveResponse(this.addressService.update(address));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IAddress | null>): void {
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

  protected updateForm(address: IAddress): void {
    this.address = address;
    this.addressFormService.resetForm(this.editForm, address);
  }
}
