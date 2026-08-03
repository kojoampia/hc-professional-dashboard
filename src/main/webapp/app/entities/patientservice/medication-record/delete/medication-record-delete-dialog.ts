import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IMedicationRecord } from '../medication-record.model';
import { MedicationRecordService } from '../service/medication-record.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medication-record-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, AlertErrorComponent, MatIconModule],
})
export class MedicationRecordDeleteDialogComponent {
  medicationRecord?: IMedicationRecord;

  protected readonly medicationRecordService = inject(MedicationRecordService);
  protected readonly dialogRef = inject(MatDialogRef<MedicationRecordDeleteDialogComponent>);

  cancel(): void {
    this.dialogRef.close();
  }

  confirmDelete(id: string): void {
    this.medicationRecordService.delete(id).subscribe(() => {
      this.dialogRef.close(ITEM_DELETED_EVENT);
    });
  }
}
