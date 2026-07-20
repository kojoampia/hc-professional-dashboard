import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import ConfirmDialogComponent, { ConfirmDialogData } from './confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class HealthConnectDialogService {
  constructor(private readonly dialog: MatDialog) {}

  confirm(data: ConfirmDialogData): MatDialogRef<ConfirmDialogComponent, boolean> {
    return this.dialog.open(ConfirmDialogComponent, {
      data,
      autoFocus: 'dialog',
      restoreFocus: true,
      disableClose: false,
    });
  }
}
