import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { IHealthConnectProfessional } from 'app/entities/professionalService/health-connect-professional/health-connect-professional.model';
import { HealthConnectProfessionalService } from 'app/entities/professionalService/health-connect-professional/service/health-connect-professional.service';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IDutyRoster } from '../duty-roster.model';
import { DutyRosterService } from '../service/duty-roster.service';

import { DutyRosterFormGroup, DutyRosterFormService } from './duty-roster-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-duty-roster-update',
  templateUrl: './duty-roster-update.html',
  imports: [TranslateDirective, TranslateModule, AlertErrorComponent, ReactiveFormsModule, MatIconModule],
})
export class DutyRosterUpdateComponent implements OnInit {
  readonly isSaving = signal(false);
  dutyRoster: IDutyRoster | null = null;

  healthConnectProfessionalsSharedCollection = signal<IHealthConnectProfessional[]>([]);

  protected dutyRosterService = inject(DutyRosterService);
  protected dutyRosterFormService = inject(DutyRosterFormService);
  protected healthConnectProfessionalService = inject(HealthConnectProfessionalService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: DutyRosterFormGroup = this.dutyRosterFormService.createDutyRosterFormGroup();

  compareHealthConnectProfessional = (o1: IHealthConnectProfessional | null, o2: IHealthConnectProfessional | null): boolean =>
    this.healthConnectProfessionalService.compareHealthConnectProfessional(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ dutyRoster }) => {
      this.dutyRoster = dutyRoster;
      if (dutyRoster) {
        this.updateForm(dutyRoster);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const dutyRoster = this.dutyRosterFormService.getDutyRoster(this.editForm);
    if (dutyRoster.id === null) {
      this.subscribeToSaveResponse(this.dutyRosterService.create(dutyRoster));
    } else {
      this.subscribeToSaveResponse(this.dutyRosterService.update(dutyRoster));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IDutyRoster | null>): void {
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

  protected updateForm(dutyRoster: IDutyRoster): void {
    this.dutyRoster = dutyRoster;
    this.dutyRosterFormService.resetForm(this.editForm, dutyRoster);

    this.healthConnectProfessionalsSharedCollection.update(healthConnectProfessionals =>
      this.healthConnectProfessionalService.addHealthConnectProfessionalToCollectionIfMissing<IHealthConnectProfessional>(
        healthConnectProfessionals,
        ...(dutyRoster.subscribedProfessionals ?? []),
      ),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.healthConnectProfessionalService
      .query()
      .pipe(map((res: HttpResponse<IHealthConnectProfessional[]>) => res.body ?? []))
      .pipe(
        map((healthConnectProfessionals: IHealthConnectProfessional[]) =>
          this.healthConnectProfessionalService.addHealthConnectProfessionalToCollectionIfMissing<IHealthConnectProfessional>(
            healthConnectProfessionals,
            ...(this.dutyRoster?.subscribedProfessionals ?? []),
          ),
        ),
      )
      .subscribe((healthConnectProfessionals: IHealthConnectProfessional[]) =>
        this.healthConnectProfessionalsSharedCollection.set(healthConnectProfessionals),
      );
  }
}
