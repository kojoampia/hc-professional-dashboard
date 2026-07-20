import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';

@Component({
  standalone: true,
  selector: 'hpd-activity-log-dialog',
  imports: [ReactiveFormsModule, TranslateModule],
  template: `
    <section class="hpd-activity-dialog" role="dialog" aria-modal="true" [attr.aria-label]="'healthConnect.activity.title' | translate">
      <form [formGroup]="form" (ngSubmit)="save()">
        <h2>{{ 'healthConnect.activity.title' | translate }}</h2>
        <label>{{ 'healthConnect.activity.eventTitle' | translate }}<input class="form-control" formControlName="title" /></label>
        <label
          >{{ 'healthConnect.activity.description' | translate }}<textarea class="form-control" formControlName="description"></textarea>
        </label>
        @if (form.invalid && submitted) {
          <p class="text-danger" role="alert">{{ 'healthConnect.validation.required' | translate }}</p>
        }
        <button class="btn btn-primary" type="submit">{{ 'healthConnect.actions.save' | translate }}</button>
        <button class="btn btn-outline-secondary" type="button" (click)="closed.emit()">
          {{ 'healthConnect.actions.cancel' | translate }}
        </button>
      </form>
    </section>
  `,
  styles: `.hpd-activity-dialog { position: fixed; inset: 0; z-index: 1050; display:grid; place-items:center; background:rgb(0 0 0 / .5); } form { background:white; padding:1.5rem; width:min(100% - 2rem, 32rem); display:grid; gap:1rem; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ActivityLogDialogComponent {
  @Input({ required: true }) patientId!: string;
  @Output() readonly closed = new EventEmitter<void>();
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: Validators.required }),
    description: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  submitted = false;
  save(): void {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }
    const timestamp = new Date().toISOString();
    this.repository.appendActivity(this.patientId, { ...this.form.getRawValue(), createdAt: timestamp });
    this.closed.emit();
  }
}
