import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IActivity } from '../activity.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-activity-detail',
  templateUrl: './activity-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslateModule, RouterLink, FormatMediumDatetimePipe],
})
export class ActivityDetail {
  readonly activity = input<IActivity | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
