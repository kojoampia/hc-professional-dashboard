import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AlertComponent } from 'app/shared/alert/alert.component';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IRecommendation } from '../recommendation.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-recommendation-detail',
  templateUrl: './recommendation-detail.html',
  imports: [AlertComponent, AlertErrorComponent, TranslateDirective, TranslateModule, RouterLink, MatIconModule],
})
export class RecommendationDetailComponent {
  readonly recommendation = input<IRecommendation | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
