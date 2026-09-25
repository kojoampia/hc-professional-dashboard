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
      <!--
        WHY THERE IS NO CASE, rather than one sentence for every reason there might not be (item
        202) — the shape patient-record-page.component.ts already uses for the record, on the read
        one screen over.

        There was a single role="alert" here saying "Nothing to show.", and it rendered in four
        unrelated situations: the case read still in flight (a deep link, a refresh, a bookmark —
        the same cold load the effect below exists for), the read REFUSED, the read FAILED, and a
        case that genuinely is not there. A technician is refused the clinical-case read outright,
        on every load, by hc-patient's scope of practice — so for a whole discipline this screen
        explained a permissions boundary as "there is nothing here".

        The empty sentence survives as the default because it is still the right one for a read
        that succeeded and found no such case — an archived case, a stale bookmark — and for idle,
        a repository that has not read yet.

        No Retry on any of them, and on the refusal that is the point rather than an omission:
        re-issuing a refused read returns the same 403 for ever.

        WHY THE @switch SITS INSIDE A LIVE REGION IT DOES NOT CREATE (item 204) — again the same
        change as the record page one file over, because these two are deliberately one shape and a
        fix on one would leave them disagreeing.

        Every arm below is its own live region, and each one used to be INSERTED TOGETHER WITH ITS
        TEXT by the arm that rendered it. role="alert" is assertive and does announce on insertion;
        role="status" is polite and generally does not — a polite region has to EXIST BEFORE ITS
        CONTENT CHANGES to be read out. So the two treatments that announced were the two reporting
        that something had gone wrong, and the refusal — the one a technician meets on every single
        load — was the one least likely to be heard.

        The wrapper is the fix and the roles are not. It is present for as long as there is no case,
        so swapping one arm for another is a CONTENT CHANGE inside a region that was already there.
        The status/alert split is item 146's and stays exactly as it was: a refusal and a read in
        flight are not errors, and announcing them assertively would interrupt.

        aria-live on a stable wrapper is what shared/health-connect/async-state/async-state.component.ts
        already does one directory over, which is why it is spelled the same way here.

        WHAT THIS CANNOT DO, so nobody reads more into it: the wrapper arrives with the @else itself,
        so whichever state is on screen at the FIRST render is still inserted with its text. Every
        transition after that — and a refusal is always one, because the read must be in flight
        before it can be refused — changes the content of a region that already exists. No screen
        reader was run; this rests on documented live-region behaviour, not on an observation.
      -->
      <div aria-live="polite" aria-atomic="true" data-cy="caseStateRegion">
        @switch (caseState().status) {
          @case ('forbidden') {
            <p role="status" data-cy="caseForbidden">{{ 'healthConnect.case.states.forbidden' | translate }}</p>
          }
          @case ('error') {
            <p role="alert" data-cy="caseFailed">{{ 'healthConnect.case.states.error' | translate }}</p>
          }
          @case ('loading') {
            <p role="status" data-cy="caseLoading">{{ 'healthConnect.case.states.loading' | translate }}</p>
          }
          @default {
            <!-- role="status", not role="alert" — backlog.md item 208, decided 2026-09-25 by the owner.
                 Absence is information, not an emergency: an alert interrupts whatever the screen
                 reader is saying, and "there is nothing here" does not warrant that. This arm is also
                 the one that can fire about a read which has not happened — it serves the ready state
                 AND the idle one, and item 203 made idle reachable on this page — so assertive was the
                 worst fit of any treatment here. This revisits item 146's choice deliberately; the
                 ERROR arm above keeps role="alert", which is what that split was really about. -->
            <p role="status" data-cy="caseEmpty">{{ 'healthConnect.case.states.empty' | translate }}</p>
          }
        }
      </div>
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
  /**
   * How the read that would have produced this case went, for the `@else` above.
   *
   * <p><b>This was `caseQueueState` — the COLLECTION read's state — until backlog.md item 203, and
   * this paragraph argued for it.</b> It read: the clinical-case read "is a <b>collection</b> read …
   * so its state is already a signal on the repository and needs no per-id accessor", which it called
   * "the one structural difference from `patient-record-page.component.ts`". The reasoning was sound
   * and the premise was false: a collection read that sends no `page` and no `size` does not hold the
   * collection. Measured on quality 2026-09-25 — <b>20 rows of 1167</b>, and <b>8</b> of the signed-in
   * clinician's <b>105</b> cases — so "not in the cache" meant "not in the server's default page",
   * and this page told a clinician that 97 of their own cases did not exist.
   *
   * <p>The structural difference is therefore gone: this page now works exactly like the record page,
   * a per-id state from a per-id read, where absence is a <b>404 the server sent</b> rather than a
   * miss in a sample nobody bounded.
   *
   * <p>Read only when there is no case: a case on screen is a case, whatever a later refresh reports.
   */
  readonly caseState = computed(() => this.repository.caseReadState(this.caseId));
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
