import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import CheckboxListComponent from '../../shared/health-connect/form-controls/checkbox-list.component';

@Component({
  standalone: true,
  selector: 'hpd-case-detail-page',
  imports: [CheckboxListComponent, ReactiveFormsModule, TranslateModule],
  template: `
    @if (clinicalCase(); as caseItem) {
      <form [formGroup]="form" (ngSubmit)="save()">
        <p>{{ parentName() }}</p>
        <label>{{ 'healthConnect.case.symptoms' | translate }}<textarea class="form-control" formControlName="symptoms"></textarea></label>
        <label
          >{{ 'healthConnect.case.diagnosis' | translate }}<textarea class="form-control" formControlName="diagnosis"></textarea>
        </label>
        <hpd-checkbox-list
          [labelKey]="'healthConnect.case.recommendations'"
          [options]="recommendations()"
          [checkedIds]="form.controls.recommendationIds.value"
          (checkedIdsChange)="form.controls.recommendationIds.setValue($event)"
        />
        <button class="btn btn-primary" type="submit">{{ 'healthConnect.actions.save' | translate }}</button>
        <button class="btn btn-outline-secondary" type="button" (click)="cancel()">{{ 'healthConnect.actions.cancel' | translate }}</button>
        <button class="btn btn-outline-secondary" type="button" (click)="print()">{{ 'healthConnect.actions.print' | translate }}</button>
      </form>
    } @else {
      <p role="alert">{{ 'healthConnect.states.empty' | translate }}</p>
    }
  `,
  styles: `form { display:grid; gap:1rem; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CaseDetailPageComponent {
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly caseId = this.route.snapshot.paramMap.get('caseId') ?? this.route.parent?.snapshot.paramMap.get('caseId') ?? '';
  readonly clinicalCase = computed(() => this.repository.findCase(this.caseId));
  readonly parentName = computed(() => this.repository.findPatient(this.clinicalCase()?.patientId ?? '')?.patient.patientName ?? '');
  readonly recommendations = computed(() => this.repository.recommendations().map(item => ({ id: item.id, labelKey: item.label })));
  readonly form = new FormGroup({
    symptoms: new FormControl('', { nonNullable: true }),
    diagnosis: new FormControl('', { nonNullable: true }),
    recommendationIds: new FormControl<readonly string[]>([], { nonNullable: true }),
  });
  constructor() {
    const item = this.clinicalCase();
    if (item) {
      this.form.setValue({ symptoms: item.symptoms, diagnosis: item.diagnosis, recommendationIds: item.recommendationIds });
    }
  }
  save(): void {
    if (this.clinicalCase()) {
      const value = this.form.getRawValue();
      this.repository.updateCase(this.caseId, { ...value, recommendationIds: [...value.recommendationIds] });
      this.cancel();
    }
  }
  cancel(): void {
    const patientId = this.clinicalCase()?.patientId;
    void this.router.navigate(patientId ? ['/patients', patientId] : ['/cases']);
  }
  print(): void {
    window.print();
  }
}
