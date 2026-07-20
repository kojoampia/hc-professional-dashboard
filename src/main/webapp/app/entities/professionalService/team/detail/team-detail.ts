import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { ITeam } from '../team.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-team-detail',
  templateUrl: './team-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslateModule, RouterLink],
})
export class TeamDetail {
  readonly team = input<ITeam | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
