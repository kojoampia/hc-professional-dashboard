import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { ITeam, NewTeam } from '../team.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts ITeam for edit and NewTeamFormGroupInput for create.
 */
type TeamFormGroupInput = ITeam | PartialWithRequiredKeyOf<NewTeam>;

type TeamFormDefaults = Pick<NewTeam, 'id'>;

type TeamFormGroupContent = {
  id: FormControl<ITeam['id'] | NewTeam['id']>;
  name: FormControl<ITeam['name']>;
  description: FormControl<ITeam['description']>;
  contact: FormControl<ITeam['contact']>;
};

export type TeamFormGroup = FormGroup<TeamFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class TeamFormService {
  createTeamFormGroup(team: TeamFormGroupInput = { id: null }): TeamFormGroup {
    const teamRawValue = {
      ...this.getFormDefaults(),
      ...team,
    };
    return new FormGroup<TeamFormGroupContent>({
      id: new FormControl(
        { value: teamRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(teamRawValue.name),
      description: new FormControl(teamRawValue.description),
      contact: new FormControl(teamRawValue.contact),
    });
  }

  getTeam(form: TeamFormGroup): ITeam | NewTeam {
    return form.getRawValue() as ITeam | NewTeam;
  }

  resetForm(form: TeamFormGroup, team: TeamFormGroupInput): void {
    const teamRawValue = { ...this.getFormDefaults(), ...team };
    form.reset(
      {
        ...teamRawValue,
        id: { value: teamRawValue.id, disabled: true },
      } as any /* cast to workaround https://github.com/angular/angular/issues/46458 */,
    );
  }

  private getFormDefaults(): TeamFormDefaults {
    return {
      id: null,
    };
  }
}
