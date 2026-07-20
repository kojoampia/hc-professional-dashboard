import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';

import { AlertError } from 'app/shared/alert/alert-error';
import { TranslateDirective } from 'app/shared/language';
import { StatService } from '../service/stat.service';
import { IStat } from '../stat.model';

import { StatFormGroup, StatFormService } from './stat-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hpd-stat-update',
  templateUrl: './stat-update.html',
  imports: [TranslateDirective, TranslateModule, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class StatUpdate implements OnInit {
  readonly isSaving = signal(false);
  stat: IStat | null = null;

  protected statService = inject(StatService);
  protected statFormService = inject(StatFormService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: StatFormGroup = this.statFormService.createStatFormGroup();

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ stat }) => {
      this.stat = stat;
      if (stat) {
        this.updateForm(stat);
      }
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const stat = this.statFormService.getStat(this.editForm);
    if (stat.id === null) {
      this.subscribeToSaveResponse(this.statService.create(stat));
    } else {
      this.subscribeToSaveResponse(this.statService.update(stat));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IStat | null>): void {
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

  protected updateForm(stat: IStat): void {
    this.stat = stat;
    this.statFormService.resetForm(this.editForm, stat);
  }
}
