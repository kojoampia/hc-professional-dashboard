import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IDutyShift } from '../duty-shift.model';
import { DutyShiftService } from '../service/duty-shift.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './duty-shift-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, AlertErrorComponent, MatIconModule],
})
export class DutyShiftDeleteDialogComponent {
  dutyShift?: IDutyShift;

  protected readonly dutyShiftService = inject(DutyShiftService);
  protected readonly dialogRef = inject(MatDialogRef<DutyShiftDeleteDialogComponent>);

  cancel(): void {
    this.dialogRef.close();
  }

  confirmDelete(id: string): void {
    this.dutyShiftService.delete(id).subscribe(() => {
      this.dialogRef.close(ITEM_DELETED_EVENT);
    });
  }
}
