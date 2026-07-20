import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

export interface ConfirmDialogData {
  titleKey: string;
  messageKey: string;
  confirmKey?: string;
  cancelKey?: string;
}

@Component({
  standalone: true,
  selector: 'hpd-confirm-dialog',
  imports: [MatDialogModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ data.titleKey | translate }}</h2>
    <mat-dialog-content>{{ data.messageKey | translate }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="hpd-focusable" mat-button type="button" (click)="cancel()">
        {{ data.cancelKey ?? 'healthConnect.actions.cancel' | translate }}
      </button>
      <button class="hpd-focusable" mat-flat-button type="button" (click)="confirm()">
        {{ data.confirmKey ?? 'healthConnect.actions.confirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ConfirmDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: ConfirmDialogData,
    private readonly dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
