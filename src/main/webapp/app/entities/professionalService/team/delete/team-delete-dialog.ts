import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { TranslateModule } from '@ngx-translate/core';

import { ITEM_DELETED_EVENT } from 'app/config/navigation.constants';
import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { TeamService } from '../service/team.service';
import { ITeam } from '../team.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './team-delete-dialog.html',
  imports: [TranslateDirective, TranslateModule, FormsModule, FontAwesomeModule, AlertError],
})
export class TeamDeleteDialog {
  team?: ITeam;

  protected readonly teamService = inject(TeamService);
  protected readonly activeModal = inject(NgbActiveModal);

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: string): void {
    this.teamService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
