import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IMedication } from '../medication.model';
import { MedicationService } from '../service/medication.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medication-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, AlertErrorComponent, MatIconModule],
})
export class MedicationDeleteDialogComponent {
  medication?: IMedication;

  protected readonly medicationService = inject(MedicationService);
  protected readonly dialogRef = inject(MatDialogRef<MedicationDeleteDialogComponent>);

  cancel(): void {
    this.dialogRef.close();
  }

  confirmDelete(id: string): void {
    this.medicationService.delete(id).subscribe(() => {
      this.dialogRef.close(ITEM_DELETED_EVENT);
    });
  }
}
