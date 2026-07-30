import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IMetadata } from '../metadata.model';
import { MetadataService } from '../service/metadata.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './metadata-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, AlertErrorComponent, MatIconModule],
})
export class MetadataDeleteDialogComponent {
  metadata?: IMetadata;

  protected readonly metadataService = inject(MetadataService);
  protected readonly dialogRef = inject(MatDialogRef<MetadataDeleteDialogComponent>);

  cancel(): void {
    this.dialogRef.close();
  }

  confirmDelete(id: string): void {
    this.metadataService.delete(id).subscribe(() => {
      this.dialogRef.close(ITEM_DELETED_EVENT);
    });
  }
}
