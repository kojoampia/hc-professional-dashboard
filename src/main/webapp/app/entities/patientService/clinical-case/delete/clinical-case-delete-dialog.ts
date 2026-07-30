import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IClinicalCase } from '../clinical-case.model';
import { ClinicalCaseService } from '../service/clinical-case.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './clinical-case-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, AlertErrorComponent, MatIconModule],
})
export class ClinicalCaseDeleteDialogComponent {
  clinicalCase?: IClinicalCase;

  protected readonly clinicalCaseService = inject(ClinicalCaseService);
  protected readonly dialogRef = inject(MatDialogRef<ClinicalCaseDeleteDialogComponent>);

  cancel(): void {
    this.dialogRef.close();
  }

  confirmDelete(id: string): void {
    this.clinicalCaseService.delete(id).subscribe(() => {
      this.dialogRef.close(ITEM_DELETED_EVENT);
    });
  }
}
