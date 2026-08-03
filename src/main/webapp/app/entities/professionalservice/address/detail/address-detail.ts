import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AlertComponent } from 'app/shared/alert/alert.component';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IAddress } from '../address.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-address-detail',
  templateUrl: './address-detail.html',
  imports: [AlertComponent, AlertErrorComponent, TranslateDirective, TranslateModule, RouterLink, FormatMediumDatePipe, MatIconModule],
})
export class AddressDetailComponent {
  readonly address = input<IAddress | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
