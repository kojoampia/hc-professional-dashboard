import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { TranslateDirective } from 'app/shared/language';
import { IHealthConnectProfessional } from '../health-connect-professional.model';
import { HealthConnectProfessionalService } from '../service/health-connect-professional.service';

import { HealthConnectProfessionalFormGroup, HealthConnectProfessionalFormService } from './health-connect-professional-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-health-connect-professional-update',
  templateUrl: './health-connect-professional-update.html',
  imports: [TranslateDirective, TranslateModule, AlertErrorComponent, ReactiveFormsModule, MatIconModule],
})
export class HealthConnectProfessionalUpdateComponent implements OnInit {
  readonly isSaving = signal(false);
  healthConnectProfessional: IHealthConnectProfessional | null = null;

  protected healthConnectProfessionalService = inject(HealthConnectProfessionalService);
  protected healthConnectProfessionalFormService = inject(HealthConnectProfessionalFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: HealthConnectProfessionalFormGroup = this.healthConnectProfessionalFormService.createHealthConnectProfessionalFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ healthConnectProfessional }) => {
      this.healthConnectProfessional = healthConnectProfessional;
      if (healthConnectProfessional) {
        this.updateForm(healthConnectProfessional);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const healthConnectProfessional = this.healthConnectProfessionalFormService.getHealthConnectProfessional(this.editForm);
    if (healthConnectProfessional.id === null) {
      this.subscribeToSaveResponse(this.healthConnectProfessionalService.create(healthConnectProfessional));
    } else {
      this.subscribeToSaveResponse(this.healthConnectProfessionalService.update(healthConnectProfessional));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IHealthConnectProfessional | null>): void {
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

  protected updateForm(healthConnectProfessional: IHealthConnectProfessional): void {
    this.healthConnectProfessional = healthConnectProfessional;
    this.healthConnectProfessionalFormService.resetForm(this.editForm, healthConnectProfessional);
  }
}
