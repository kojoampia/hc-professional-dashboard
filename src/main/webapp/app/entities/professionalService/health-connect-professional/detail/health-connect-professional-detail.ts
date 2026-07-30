import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AlertComponent } from 'app/shared/alert/alert.component';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IHealthConnectProfessional } from '../health-connect-professional.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-health-connect-professional-detail',
  templateUrl: './health-connect-professional-detail.html',
  imports: [AlertComponent, AlertErrorComponent, TranslateDirective, TranslateModule, RouterLink, MatIconModule],
})
export class HealthConnectProfessionalDetailComponent {
  readonly healthConnectProfessional = input<IHealthConnectProfessional | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
