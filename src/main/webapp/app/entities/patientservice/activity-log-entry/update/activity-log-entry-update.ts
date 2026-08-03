import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IActivityLogEntry } from '../activity-log-entry.model';
import { ActivityLogEntryService } from '../service/activity-log-entry.service';

import { ActivityLogEntryFormGroup, ActivityLogEntryFormService } from './activity-log-entry-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-activity-log-entry-update',
  templateUrl: './activity-log-entry-update.html',
  imports: [TranslateDirective, TranslateModule, AlertErrorComponent, ReactiveFormsModule, MatIconModule],
})
export class ActivityLogEntryUpdateComponent implements OnInit {
  readonly isSaving = signal(false);
  activityLogEntry: IActivityLogEntry | null = null;

  protected activityLogEntryService = inject(ActivityLogEntryService);
  protected activityLogEntryFormService = inject(ActivityLogEntryFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ActivityLogEntryFormGroup = this.activityLogEntryFormService.createActivityLogEntryFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ activityLogEntry }) => {
      this.activityLogEntry = activityLogEntry;
      if (activityLogEntry) {
        this.updateForm(activityLogEntry);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const activityLogEntry = this.activityLogEntryFormService.getActivityLogEntry(this.editForm);
    if (activityLogEntry.id === null) {
      this.subscribeToSaveResponse(this.activityLogEntryService.create(activityLogEntry));
    } else {
      this.subscribeToSaveResponse(this.activityLogEntryService.update(activityLogEntry));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IActivityLogEntry | null>): void {
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

  protected updateForm(activityLogEntry: IActivityLogEntry): void {
    this.activityLogEntry = activityLogEntry;
    this.activityLogEntryFormService.resetForm(this.editForm, activityLogEntry);
  }
}
