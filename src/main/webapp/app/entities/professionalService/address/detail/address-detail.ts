import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IAddress } from '../address.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-address-detail',
  templateUrl: './address-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslateModule, RouterLink, FormatMediumDatePipe],
})
export class AddressDetail {
  readonly address = input<IAddress | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
