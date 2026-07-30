import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IActivityLogEntry } from '../activity-log-entry.model';
import { ActivityLogEntryService } from '../service/activity-log-entry.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-log-entry-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, AlertErrorComponent, MatIconModule],
})
export class ActivityLogEntryDeleteDialogComponent {
  activityLogEntry?: IActivityLogEntry;

  protected readonly activityLogEntryService = inject(ActivityLogEntryService);
  protected readonly dialogRef = inject(MatDialogRef<ActivityLogEntryDeleteDialogComponent>);

  cancel(): void {
    this.dialogRef.close();
  }

  confirmDelete(id: string): void {
    this.activityLogEntryService.delete(id).subscribe(() => {
      this.dialogRef.close(ITEM_DELETED_EVENT);
    });
  }
}
