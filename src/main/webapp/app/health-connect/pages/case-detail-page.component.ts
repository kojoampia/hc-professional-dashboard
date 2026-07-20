import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';

import { hasHealthConnectPermission } from '../authority-role';
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
        <label for="hpd-case-symptoms"
          >{{ 'healthConnect.case.symptoms' | translate
          }}<textarea
            id="hpd-case-symptoms"
            class="form-control hpd-focusable"
            formControlName="symptoms"
            [readOnly]="!canManageCases()"
          ></textarea>
        </label>
        <label for="hpd-case-diagnosis"
          >{{ 'healthConnect.case.diagnosis' | translate
          }}<textarea
            id="hpd-case-diagnosis"
            class="form-control hpd-focusable"
            formControlName="diagnosis"
            [readOnly]="!canManageCases()"
          ></textarea>
        </label>
        <hpd-checkbox-list
          [labelKey]="'healthConnect.case.recommendations'"
          [options]="recommendations()"
          [checkedIds]="form.controls.recommendationIds.value"
          [disabled]="!canManageCases()"
          (checkedIdsChange)="form.controls.recommendationIds.setValue($event)"
        />
        @if (!canManageCases()) {
          <p class="hpd-read-only" role="status">{{ 'healthConnect.states.readOnly' | translate }}</p>
        }
        <div class="hpd-case-detail__actions hpd-no-print">
          <button class="hpd-focusable btn btn-primary" type="submit" [disabled]="!canManageCases()">
            {{ 'healthConnect.actions.save' | translate }}
          </button>
          <button class="hpd-focusable btn btn-outline-secondary" type="button" (click)="cancel()">
            {{ 'healthConnect.actions.cancel' | translate }}
          </button>
          <button class="hpd-focusable btn btn-outline-secondary" type="button" (click)="print()">
            {{ 'healthConnect.actions.print' | translate }}
          </button>
        </div>
      </form>
    } @else {
      <p role="alert">{{ 'healthConnect.states.empty' | translate }}</p>
    }
  `,
  styles: `
    form { display:grid; gap:1rem; }
    .hpd-case-detail__actions { display:flex; flex-wrap:wrap; gap:.5rem; }
    .hpd-read-only { color: var(--hpd-color-text-muted); }
    @media (max-width: 375px) { .hpd-case-detail__actions > button { flex: 1 1 100%; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CaseDetailPageComponent {
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly account = inject(AccountService);
  private readonly currentAccount = toSignal(this.account.getAuthenticationState(), { initialValue: null });
  readonly caseId = this.route.snapshot.paramMap.get('caseId') ?? this.route.parent?.snapshot.paramMap.get('caseId') ?? '';
  readonly clinicalCase = computed(() => this.repository.findCase(this.caseId));
  readonly parentName = computed(() => this.repository.findPatient(this.clinicalCase()?.patientId ?? '')?.patient.patientName ?? '');
  readonly recommendations = computed(() => this.repository.recommendations().map(item => ({ id: item.id, labelKey: item.label })));
  readonly canManageCases = computed(() => hasHealthConnectPermission(this.currentAccount()?.authorities, 'manageCase'));
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
    if (this.clinicalCase() && this.canManageCases()) {
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
