import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import ConfirmDialogComponent, { ConfirmDialogData } from './confirm-dialog.component';
import ReasonDialogComponent, { ReasonDialogData } from './reason-dialog.component';

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

  /**
   * Confirms, and collects the reason the action requires.
   *
   * <p>Closes with the trimmed reason, or `null` if the user backed out — so a caller distinguishes
   * "they cancelled" from "they typed nothing", which the boolean of {@link confirm} cannot.</p>
   */
  reason(data: ReasonDialogData): MatDialogRef<ReasonDialogComponent, string | null> {
    return this.dialog.open(ReasonDialogComponent, {
      data,
      autoFocus: 'dialog',
      restoreFocus: true,
      disableClose: false,
    });
  }
}
