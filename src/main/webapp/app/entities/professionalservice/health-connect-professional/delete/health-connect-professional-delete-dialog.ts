import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IHealthConnectProfessional } from '../health-connect-professional.model';
import { HealthConnectProfessionalService } from '../service/health-connect-professional.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './health-connect-professional-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, AlertErrorComponent, MatIconModule],
})
export class HealthConnectProfessionalDeleteDialogComponent {
  healthConnectProfessional?: IHealthConnectProfessional;

  protected readonly healthConnectProfessionalService = inject(HealthConnectProfessionalService);
  protected readonly dialogRef = inject(MatDialogRef<HealthConnectProfessionalDeleteDialogComponent>);

  cancel(): void {
    this.dialogRef.close();
  }

  confirmDelete(id: string): void {
    this.healthConnectProfessionalService.delete(id).subscribe(() => {
      this.dialogRef.close(ITEM_DELETED_EVENT);
    });
  }
}
