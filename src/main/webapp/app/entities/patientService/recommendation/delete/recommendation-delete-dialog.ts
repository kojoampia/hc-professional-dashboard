import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IRecommendation } from '../recommendation.model';
import { RecommendationService } from '../service/recommendation.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recommendation-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, AlertErrorComponent, MatIconModule],
})
export class RecommendationDeleteDialogComponent {
  recommendation?: IRecommendation;

  protected readonly recommendationService = inject(RecommendationService);
  protected readonly dialogRef = inject(MatDialogRef<RecommendationDeleteDialogComponent>);

  cancel(): void {
    this.dialogRef.close();
  }

  confirmDelete(id: string): void {
    this.recommendationService.delete(id).subscribe(() => {
      this.dialogRef.close(ITEM_DELETED_EVENT);
    });
  }
}
