import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';
import { AlertService } from 'app/core/util/alert.service';

import { hasHealthConnectPermission } from '../authority-role';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import CheckboxListComponent from '../../shared/health-connect/form-controls/checkbox-list.component';

@Component({
  standalone: true,
  selector: 'hpd-case-detail-page',
  imports: [CheckboxListComponent, MatIconModule, ReactiveFormsModule, TranslateModule],
  template: `
    @if (clinicalCase(); as caseItem) {
      <form [formGroup]="form" (ngSubmit)="save()">
        <p class="mb-4 text-sm text-hpd-muted">{{ parentName() }}</p>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div class="flex flex-col">
            <h2 class="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-hpd-primary-dark">
              <mat-icon aria-hidden="true" class="!text-lg text-hpd-subtle">sick</mat-icon>
              {{ 'healthConnect.case.symptoms' | translate }}
            </h2>
            <label for="hpd-case-symptoms" class="sr-only">{{ 'healthConnect.case.symptoms' | translate }}</label>
            <textarea
              id="hpd-case-symptoms"
              class="hpd-focusable h-52 flex-1 resize-none rounded-hpd-sm border border-hpd-border bg-white p-3 text-sm shadow-hpd-sm"
              formControlName="symptoms"
              [readOnly]="!canManageCases()"
            ></textarea>
          </div>
          <div class="flex flex-col">
            <h2 class="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-hpd-primary-dark">
              <mat-icon aria-hidden="true" class="!text-lg text-hpd-subtle">medical_services</mat-icon>
              {{ 'healthConnect.case.diagnosis' | translate }}
            </h2>
            <label for="hpd-case-diagnosis" class="sr-only">{{ 'healthConnect.case.diagnosis' | translate }}</label>
            <textarea
              id="hpd-case-diagnosis"
              class="hpd-focusable h-52 flex-1 resize-none rounded-hpd-sm border border-hpd-border bg-white p-3 text-sm shadow-hpd-sm"
              formControlName="diagnosis"
              [readOnly]="!canManageCases()"
            ></textarea>
          </div>
          <div class="flex flex-col">
            <h2 class="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-hpd-primary-dark">
              <mat-icon aria-hidden="true" class="!text-lg text-hpd-subtle">fact_check</mat-icon>
              {{ 'healthConnect.case.recommendations' | translate }}
            </h2>
            <div class="flex-1 overflow-y-auto rounded-hpd-sm border border-hpd-border bg-white p-4 shadow-hpd-sm">
              <hpd-checkbox-list
                [labelKey]="'healthConnect.case.recommendations'"
                [options]="recommendations()"
                [checkedIds]="form.controls.recommendationIds.value"
                [disabled]="!canManageCases()"
                (checkedIdsChange)="form.controls.recommendationIds.setValue($event)"
              />
            </div>
          </div>
        </div>
        @if (!canManageCases()) {
          <p class="hpd-read-only mt-4 text-sm text-hpd-muted" role="status">{{ 'healthConnect.states.readOnly' | translate }}</p>
        }
        <div class="hpd-case-detail__actions hpd-no-print mt-6 flex flex-wrap justify-end gap-2">
          <button
            class="hpd-focusable flex cursor-pointer items-center gap-1 rounded-hpd-sm border-[1.5px] border-hpd-border bg-white px-3 py-1.5 text-sm font-bold text-hpd-primary-dark hover:border-hpd-primary"
            type="button"
            (click)="print()"
          >
            <mat-icon aria-hidden="true" class="!text-base">print</mat-icon>
            {{ 'healthConnect.actions.print' | translate }}
          </button>
          <button
            class="hpd-focusable cursor-pointer rounded-hpd-sm border-[1.5px] border-hpd-border bg-white px-4 py-1.5 text-sm font-bold text-hpd-primary-dark hover:border-hpd-primary"
            type="button"
            (click)="cancel()"
          >
            {{ 'healthConnect.actions.cancel' | translate }}
          </button>
          <button
            class="hpd-focusable flex cursor-pointer items-center gap-1 rounded-hpd-sm bg-hpd-gold px-4 py-1.5 text-sm font-bold text-[#3a2a08] shadow-hpd-sm hover:bg-hpd-gold-bright"
            type="submit"
            [disabled]="!canManageCases()"
          >
            <mat-icon aria-hidden="true" class="!text-base">save</mat-icon>
            {{ 'healthConnect.actions.save' | translate }}
          </button>
        </div>
      </form>
    } @else {
      <p role="alert">{{ 'healthConnect.states.empty' | translate }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CaseDetailPageComponent {
  readonly repository = inject(HEALTH_CONNECT_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly account = inject(AccountService);
  private readonly alertService = inject(AlertService);
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
  /** Set once the form has been filled from the loaded case, so a later emission cannot refill it. */
  private hydrated = false;

  /**
   * Fill the form when the case arrives, which is not necessarily when this component is created.
   *
   * <p>This was a bare read in the constructor. That works when the case is already cached — which
   * it is when you click a row in the queue — and fails silently on a <b>cold load</b>: a deep
   * link, a refresh, or a bookmark. The repository has not fetched yet, the read returns
   * {@code undefined}, every field is left empty, and nothing ever looks again, because a computed
   * signal that nothing subscribes to does not re-render a reactive form. The result was a record
   * that rendered blank with a live Save button, and <b>saving wrote the blanks over the case</b>.
   *
   * <p>Two guards, and both are load-bearing. {@code hydrated} stops a second emission resetting
   * the form under the clinician mid-edit; {@code form.dirty} covers the narrower race where they
   * started typing into the empty form before the response landed. Neither alone is enough: the
   * first does nothing if the case arrives twice before anyone types, the second does nothing if
   * they have typed nothing yet.
   */
  constructor() {
    effect(() => {
      const item = this.clinicalCase();
      if (!item || this.hydrated || this.form.dirty) {
        return;
      }
      this.hydrated = true;
      this.form.setValue({ symptoms: item.symptoms, diagnosis: item.diagnosis, recommendationIds: item.recommendationIds });
    });
  }
  save(): void {
    if (this.clinicalCase() && this.canManageCases()) {
      const value = this.form.getRawValue();
      this.repository.updateCase(this.caseId, { ...value, recommendationIds: [...value.recommendationIds] });
      this.alertService.showToast('healthConnect.toast.caseSaved');
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
