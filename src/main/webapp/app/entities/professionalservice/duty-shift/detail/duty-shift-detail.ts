import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AlertComponent } from 'app/shared/alert/alert.component';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IDutyShift } from '../duty-shift.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-duty-shift-detail',
  templateUrl: './duty-shift-detail.html',
  imports: [AlertComponent, AlertErrorComponent, TranslateDirective, TranslateModule, RouterLink, FormatMediumDatetimePipe, MatIconModule],
})
export class DutyShiftDetailComponent {
  readonly dutyShift = input<IDutyShift | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
