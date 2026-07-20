import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import SharedModule from 'app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IProfile } from '../profile.model';
import { ProfileService } from '../service/profile.service';
import { ProfileFormService, ProfileFormGroup } from './profile-form.service';

@Component({
  selector: 'hpd-profile-update',
  templateUrl: './profile-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class ProfileUpdateComponent implements OnInit {
  isSaving = false;
  profile: IProfile | null = null;

  editForm: ProfileFormGroup = this.profileFormService.createProfileFormGroup();

  constructor(
    protected profileService: ProfileService,
    protected profileFormService: ProfileFormService,
    protected activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ profile }) => {
      this.profile = profile;
      if (profile) {
        this.updateForm(profile);
      }
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const profile = this.profileFormService.getProfile(this.editForm);
    if (profile.id !== null) {
      this.subscribeToSaveResponse(this.profileService.update(profile));
    } else {
      this.subscribeToSaveResponse(this.profileService.create(profile));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IProfile>>): void {
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
    this.isSaving = false;
  }

  protected updateForm(profile: IProfile): void {
    this.profile = profile;
    this.profileFormService.resetForm(this.editForm, profile);
  }
}
