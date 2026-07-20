import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IProfile } from '../profile.model';
import { ProfileService } from '../service/profile.service';

import { ProfileFormGroup, ProfileFormService } from './profile-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-profile-update',
  templateUrl: './profile-update.html',
  imports: [TranslateDirective, TranslateModule, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class ProfileUpdate implements OnInit {
  readonly isSaving = signal(false);
  profile: IProfile | null = null;

  protected profileService = inject(ProfileService);
  protected profileFormService = inject(ProfileFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ProfileFormGroup = this.profileFormService.createProfileFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ profile }) => {
      this.profile = profile;
      if (profile) {
        this.updateForm(profile);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const profile = this.profileFormService.getProfile(this.editForm);
    if (profile.id === null) {
      this.subscribeToSaveResponse(this.profileService.create(profile));
    } else {
      this.subscribeToSaveResponse(this.profileService.update(profile));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IProfile | null>): void {
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

  protected updateForm(profile: IProfile): void {
    this.profile = profile;
    this.profileFormService.resetForm(this.editForm, profile);
  }
}
