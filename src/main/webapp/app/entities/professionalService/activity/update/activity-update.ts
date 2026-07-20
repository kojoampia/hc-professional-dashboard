import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { IActivity } from '../activity.model';
import { ActivityService } from '../service/activity.service';

import { ActivityFormGroup, ActivityFormService } from './activity-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-activity-update',
  templateUrl: './activity-update.html',
  imports: [TranslateDirective, TranslateModule, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class ActivityUpdate implements OnInit {
  readonly isSaving = signal(false);
  activity: IActivity | null = null;

  protected activityService = inject(ActivityService);
  protected activityFormService = inject(ActivityFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ActivityFormGroup = this.activityFormService.createActivityFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ activity }) => {
      this.activity = activity;
      if (activity) {
        this.updateForm(activity);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const activity = this.activityFormService.getActivity(this.editForm);
    if (activity.id === null) {
      this.subscribeToSaveResponse(this.activityService.create(activity));
    } else {
      this.subscribeToSaveResponse(this.activityService.update(activity));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IActivity | null>): void {
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

  protected updateForm(activity: IActivity): void {
    this.activity = activity;
    this.activityFormService.resetForm(this.editForm, activity);
  }
}
