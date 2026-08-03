import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AlertComponent } from 'app/shared/alert/alert.component';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IMedicationRecord } from '../medication-record.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-medication-record-detail',
  templateUrl: './medication-record-detail.html',
  imports: [AlertComponent, AlertErrorComponent, TranslateDirective, TranslateModule, RouterLink, FormatMediumDatetimePipe, MatIconModule],
})
export class MedicationRecordDetailComponent {
  readonly medicationRecord = input<IMedicationRecord | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
