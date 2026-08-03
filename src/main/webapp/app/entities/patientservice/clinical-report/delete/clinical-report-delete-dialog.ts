import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IClinicalReport } from '../clinical-report.model';
import { ClinicalReportService } from '../service/clinical-report.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './clinical-report-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, AlertErrorComponent, MatIconModule],
})
export class ClinicalReportDeleteDialogComponent {
  clinicalReport?: IClinicalReport;

  protected readonly clinicalReportService = inject(ClinicalReportService);
  protected readonly dialogRef = inject(MatDialogRef<ClinicalReportDeleteDialogComponent>);

  cancel(): void {
    this.dialogRef.close();
  }

  confirmDelete(id: string): void {
    this.clinicalReportService.delete(id).subscribe(() => {
      this.dialogRef.close(ITEM_DELETED_EVENT);
    });
  }
}
