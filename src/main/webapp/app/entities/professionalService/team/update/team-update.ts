import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { TeamService } from '../service/team.service';
import { ITeam } from '../team.model';

import { TeamFormGroup, TeamFormService } from './team-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-team-update',
  templateUrl: './team-update.html',
  imports: [TranslateDirective, TranslateModule, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class TeamUpdate implements OnInit {
  readonly isSaving = signal(false);
  team: ITeam | null = null;

  protected teamService = inject(TeamService);
  protected teamFormService = inject(TeamFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: TeamFormGroup = this.teamFormService.createTeamFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ team }) => {
      this.team = team;
      if (team) {
        this.updateForm(team);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const team = this.teamFormService.getTeam(this.editForm);
    if (team.id === null) {
      this.subscribeToSaveResponse(this.teamService.create(team));
    } else {
      this.subscribeToSaveResponse(this.teamService.update(team));
    }
  }

  protected subscribeToSaveResponse(result: Observable<ITeam | null>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving.set(false);
  }

  protected updateForm(team: ITeam): void {
    this.team = team;
    this.teamFormService.resetForm(this.editForm, team);
  }
}
