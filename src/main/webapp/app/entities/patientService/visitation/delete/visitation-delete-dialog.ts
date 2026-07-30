import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { VisitationService } from '../service/visitation.service';
import { IVisitation } from '../visitation.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './visitation-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, AlertErrorComponent, MatIconModule],
})
export class VisitationDeleteDialogComponent {
  visitation?: IVisitation;

  protected readonly visitationService = inject(VisitationService);
  protected readonly dialogRef = inject(MatDialogRef<VisitationDeleteDialogComponent>);

  cancel(): void {
    this.dialogRef.close();
  }

  confirmDelete(id: string): void {
    this.visitationService.delete(id).subscribe(() => {
      this.dialogRef.close(ITEM_DELETED_EVENT);
    });
  }
}
