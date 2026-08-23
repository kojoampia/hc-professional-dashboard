import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export interface ReasonDialogData {
  titleKey: string;
  messageKey: string;
  labelKey: string;
  confirmKey?: string;
  cancelKey?: string;
}

/**
 * A confirm that also asks why.
 *
 * <p>Separate from {@link ConfirmDialogComponent} rather than an optional field on it: a confirm
 * answers yes or no and can be dismissed with either, while this cannot be confirmed at all until
 * something has been typed. Folding the two together would put a disabled-button rule into every
 * confirmation in the app to serve the one that needs it.</p>
 *
 * <p>Written for archiving a clinical case, where the backend requires a reason and says why: an
 * archive with no reason is the delete that patient data does not allow, wearing a different name.
 * A canned default sent from here would satisfy the endpoint and defeat the point of it.</p>
 */
@Component({
  standalone: true,
  selector: 'hpd-reason-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ data.titleKey | translate }}</h2>
    <mat-dialog-content>
      <p>{{ data.messageKey | translate }}</p>
      <mat-form-field class="hpd-reason-dialog__field" appearance="outline">
        <mat-label>{{ data.labelKey | translate }}</mat-label>
        <textarea matInput rows="3" [ngModel]="reason()" (ngModelChange)="reason.set($event)"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="hpd-focusable" mat-button type="button" (click)="cancel()">
        {{ data.cancelKey ?? 'healthConnect.actions.cancel' | translate }}
      </button>
      <button class="hpd-focusable" mat-flat-button type="button" [disabled]="!trimmed()" (click)="confirm()">
        {{ data.confirmKey ?? 'healthConnect.actions.confirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .hpd-reason-dialog__field {
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReasonDialogComponent {
  readonly reason = signal('');

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: ReasonDialogData,
    private readonly dialogRef: MatDialogRef<ReasonDialogComponent, string | null>,
  ) {}

  /** Whitespace is not a reason, so the button stays disabled for it. */
  trimmed(): string {
    return this.reason().trim();
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    const reason = this.trimmed();
    if (reason) {
      this.dialogRef.close(reason);
    }
  }
}
