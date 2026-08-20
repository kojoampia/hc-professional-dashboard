import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { AccountService } from 'app/core/auth/account.service';
import { AlertService } from 'app/core/util/alert.service';
import { Authority } from 'app/config/authority.constants';

import { DutyRosterAssignmentDto, DutyRosterAssignmentsService, DutyRosterShift } from '../api/duty-roster-assignments.service';

/** Offered in window order, so the select reads down the day. FLEXIBLE last — it spans all of it. */
const SHIFTS: readonly DutyRosterShift[] = ['DAY', 'EVENING', 'NIGHT', 'FLEXIBLE'];
const DUTIES: readonly string[] = [
  'DOCTOR',
  'NURSE',
  'PARAMEDIC',
  'PHARMACIST',
  'THERAPIST',
  'CARER',
  'ANGEL',
  'CHEMIST',
  'TECHNICIAN',
  'OTHER',
];

/**
 * Duty roster (WP6, admin-assignment-only decision): professionals see their
 * own assignments read-only; administrators additionally assign and unassign.
 * Backed by the real `/api/duty-roster` surface — the bare GET for the
 * caller's own assignments, `/all` for the administrator's estate view (DR1).
 */
@Component({
  standalone: true,
  selector: 'hpd-duty-roster-page',
  imports: [ReactiveFormsModule, TranslateModule],
  template: `
    <main class="w-full px-4 py-8 md:px-8">
      <h1 class="sr-only">{{ 'healthConnect.navigation.dutyRoster' | translate }}</h1>

      <section class="mb-4 overflow-hidden rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" data-cy="myAssignments">
        <h2 class="m-0 border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted">
          {{ 'healthConnect.roster.myAssignments' | translate }}
        </h2>
        <ul class="m-0 grid list-none gap-2 p-5">
          @for (assignment of myAssignments(); track assignment.id) {
            <li class="flex flex-wrap items-center justify-between gap-3 rounded-hpd-sm border border-hpd-border px-3.5 py-2.5 text-sm">
              <span class="min-w-0 truncate text-hpd-primary-dark">
                {{ assignment.date }} · {{ assignment.name }}
                <span class="text-hpd-muted">({{ 'healthConnect.roster.duties.' + assignment.duty | translate }})</span>
              </span>
              <span class="rounded-full bg-[#e7eef6] px-2.5 py-0.5 text-[11px] font-bold text-hpd-primary">
                {{ 'healthConnect.roster.shiftNames.' + assignment.shift | translate }}
              </span>
            </li>
          } @empty {
            <li class="py-3 text-center text-sm text-hpd-subtle" data-cy="noAssignments">
              {{ 'healthConnect.roster.notAssigned' | translate }}
            </li>
          }
        </ul>
        @if (!isAdmin()) {
          <p class="m-0 border-t border-hpd-border bg-hpd-cream/50 px-5 py-2.5 text-xs text-hpd-muted">
            {{ 'healthConnect.roster.assignmentOnly' | translate }}
          </p>
        }
      </section>

      @if (isAdmin()) {
        <section class="overflow-hidden rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" data-cy="rosterAdmin">
          <h2
            class="m-0 border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted"
          >
            {{ 'healthConnect.roster.administer' | translate }}
          </h2>
          <div class="grid gap-5 p-5">
            <form class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" [formGroup]="assignForm" (ngSubmit)="assign()">
              <div>
                <label class="hpd-label" for="dr-professional">{{ 'healthConnect.roster.professionalId' | translate }}</label>
                <input
                  id="dr-professional"
                  class="hpd-focusable hpd-input"
                  formControlName="professionalId"
                  data-cy="assignProfessionalId"
                />
              </div>
              <div>
                <label class="hpd-label" for="dr-date">{{ 'healthConnect.roster.date' | translate }}</label>
                <input id="dr-date" class="hpd-focusable hpd-input" type="date" formControlName="date" data-cy="assignDate" />
              </div>
              <div>
                <label class="hpd-label" for="dr-shift">{{ 'healthConnect.roster.shift' | translate }}</label>
                <select id="dr-shift" class="hpd-focusable hpd-input" formControlName="shift">
                  @for (shift of shifts; track shift) {
                    <option [value]="shift">{{ 'healthConnect.roster.shiftNames.' + shift | translate }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="hpd-label" for="dr-duty">{{ 'healthConnect.roster.duty' | translate }}</label>
                <select id="dr-duty" class="hpd-focusable hpd-input" formControlName="duty">
                  @for (duty of duties; track duty) {
                    <option [value]="duty">{{ 'healthConnect.roster.duties.' + duty | translate }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="hpd-label" for="dr-name">{{ 'healthConnect.roster.wardName' | translate }}</label>
                <input id="dr-name" class="hpd-focusable hpd-input" formControlName="name" data-cy="assignName" />
              </div>
              <div class="sm:col-span-2 lg:col-span-5">
                <button class="hpd-focusable hpd-btn hpd-btn-primary" type="submit" [disabled]="busy()" data-cy="assignSubmit">
                  {{ 'healthConnect.roster.assign' | translate }}
                </button>
              </div>
            </form>

            <ul class="m-0 grid list-none gap-2 p-0" data-cy="allAssignments">
              @for (assignment of allAssignments(); track assignment.id) {
                <li class="flex flex-wrap items-center justify-between gap-3 rounded-hpd-sm border border-hpd-border px-3.5 py-2.5 text-sm">
                  <span class="min-w-0 truncate text-hpd-primary-dark">
                    {{ assignment.date }} · {{ assignment.name }} · {{ assignment.professionalId }}
                    <span class="text-hpd-muted">({{ 'healthConnect.roster.duties.' + assignment.duty | translate }})</span>
                  </span>
                  <span class="flex items-center gap-2">
                    <span class="rounded-full bg-[#e7eef6] px-2.5 py-0.5 text-[11px] font-bold text-hpd-primary">
                      {{ 'healthConnect.roster.shiftNames.' + assignment.shift | translate }}
                    </span>
                    <button
                      class="hpd-focusable hpd-btn hpd-btn-danger !px-2.5 !py-1 !text-xs"
                      type="button"
                      [disabled]="busy()"
                      [attr.data-cy]="'unassign-' + assignment.id"
                      (click)="unassign(assignment)"
                    >
                      {{ 'healthConnect.roster.unassign' | translate }}
                    </button>
                  </span>
                </li>
              } @empty {
                <li class="py-3 text-center text-sm text-hpd-subtle">{{ 'healthConnect.states.empty' | translate }}</li>
              }
            </ul>
          </div>
        </section>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DutyRosterPageComponent implements OnInit {
  private readonly rosterService = inject(DutyRosterAssignmentsService);
  private readonly account = inject(AccountService);
  private readonly alertService = inject(AlertService);
  private readonly currentAccount = toSignal(this.account.getAuthenticationState(), { initialValue: null });

  readonly shifts = SHIFTS;
  readonly duties = DUTIES;
  readonly myAssignments = this.rosterService.myAssignments;
  readonly allAssignments = signal<DutyRosterAssignmentDto[]>([]);
  readonly busy = signal(false);

  readonly isAdmin = computed(() => (this.currentAccount()?.authorities ?? []).includes(Authority.ADMIN));

  readonly assignForm = new FormGroup({
    professionalId: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    date: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    shift: new FormControl<DutyRosterShift>('DAY', { nonNullable: true, validators: Validators.required }),
    duty: new FormControl<string>('NURSE', { nonNullable: true, validators: Validators.required }),
    name: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
  });

  ngOnInit(): void {
    this.rosterService.loadMyAssignments();
    if (this.isAdmin()) {
      this.refreshAll();
    }
  }

  assign(): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.rosterService.assign(this.assignForm.getRawValue()).subscribe({
      next: () => {
        this.busy.set(false);
        this.assignForm.reset();
        this.alertService.showToast('healthConnect.toast.rosterUpdated');
        this.refreshAll();
      },
      error: () => this.busy.set(false),
    });
  }

  unassign(assignment: DutyRosterAssignmentDto): void {
    if (!assignment.id) {
      return;
    }
    this.busy.set(true);
    this.rosterService.unassign(assignment.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.alertService.showToast('healthConnect.toast.rosterUpdated');
        this.refreshAll();
      },
      error: () => this.busy.set(false),
    });
  }

  private refreshAll(): void {
    this.rosterService.listAll().subscribe({
      next: assignments => this.allAssignments.set(assignments),
      error: () => this.allAssignments.set([]),
    });
  }
}
