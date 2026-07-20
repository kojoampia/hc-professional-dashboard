import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IReport } from '../report.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-report-detail',
  templateUrl: './report-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslateModule, RouterLink, FormatMediumDatePipe],
})
export class ReportDetail {
  readonly report = input<IReport | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
