import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { DutyShiftStatus } from 'app/entities/enumerations/duty-shift-status.model';
import { IDutyRoster } from 'app/entities/professionalService/duty-roster/duty-roster.model';
import { DutyRosterService } from 'app/entities/professionalService/duty-roster/service/duty-roster.service';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IDutyShift } from '../duty-shift.model';
import { DutyShiftService } from '../service/duty-shift.service';

import { DutyShiftFormGroup, DutyShiftFormService } from './duty-shift-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-duty-shift-update',
  templateUrl: './duty-shift-update.html',
  imports: [TranslateDirective, TranslateModule, AlertErrorComponent, ReactiveFormsModule, MatIconModule],
})
export class DutyShiftUpdateComponent implements OnInit {
  readonly isSaving = signal(false);
  dutyShift: IDutyShift | null = null;
  dutyShiftStatusValues = Object.keys(DutyShiftStatus);

  dutyRostersSharedCollection = signal<IDutyRoster[]>([]);

  protected dutyShiftService = inject(DutyShiftService);
  protected dutyShiftFormService = inject(DutyShiftFormService);
  protected dutyRosterService = inject(DutyRosterService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: DutyShiftFormGroup = this.dutyShiftFormService.createDutyShiftFormGroup();

  compareDutyRoster = (o1: IDutyRoster | null, o2: IDutyRoster | null): boolean => this.dutyRosterService.compareDutyRoster(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ dutyShift }) => {
      this.dutyShift = dutyShift;
      if (dutyShift) {
        this.updateForm(dutyShift);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const dutyShift = this.dutyShiftFormService.getDutyShift(this.editForm);
    if (dutyShift.id === null) {
      this.subscribeToSaveResponse(this.dutyShiftService.create(dutyShift));
    } else {
      this.subscribeToSaveResponse(this.dutyShiftService.update(dutyShift));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IDutyShift | null>): void {
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

  protected updateForm(dutyShift: IDutyShift): void {
    this.dutyShift = dutyShift;
    this.dutyShiftFormService.resetForm(this.editForm, dutyShift);

    this.dutyRostersSharedCollection.update(dutyRosters =>
      this.dutyRosterService.addDutyRosterToCollectionIfMissing<IDutyRoster>(dutyRosters, dutyShift.roster),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.dutyRosterService
      .query()
      .pipe(map((res: HttpResponse<IDutyRoster[]>) => res.body ?? []))
      .pipe(
        map((dutyRosters: IDutyRoster[]) =>
          this.dutyRosterService.addDutyRosterToCollectionIfMissing<IDutyRoster>(dutyRosters, this.dutyShift?.roster),
        ),
      )
      .subscribe((dutyRosters: IDutyRoster[]) => this.dutyRostersSharedCollection.set(dutyRosters));
  }
}
