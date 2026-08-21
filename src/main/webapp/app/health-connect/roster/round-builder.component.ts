import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { AlertService } from 'app/core/util/alert.service';

import { AbsenceApiService, AbsenceDto } from '../api/absence-api.service';
import { DutyRosterAssignmentDto, DutyRosterAssignmentsService, VisitDto } from '../api/duty-roster-assignments.service';
import { DutyRosterShift } from '../health-connect.models';

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

const visitGroup = (): FormGroup =>
  new FormGroup({
    customerId: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    startTime: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    endTime: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
  });

/**
 * The roster administrator's write surface (docs/duty-roster.md §§ 4, 8, DR8): build a round, and
 * move one when somebody is off.
 *
 * <p><b>A round is a round of visits now, and this is where they are entered.</b> Before DR8 the
 * assign form wrote a bare shift — date, ward, duty — while the backend had carried `visits` since
 * DR2, so every round created through the UI had none and the day popup had nothing to show. Visit
 * rows are optional: **a shift with no visits is still a shift** (ward cover, on call, administrative
 * time), and the form does not require one.
 *
 * <p><b>The server owns every rule and this form re-states none of them.</b> Visit times outside the
 * shift window, an end before its start, an overlap with another round the professional already
 * holds — all 400s, shown verbatim, because the message names which rule and there are four of them.
 * Re-implementing the window table here would be a second copy of the `NIGHT` wrap, which is the
 * single easiest thing in this subsystem to get subtly wrong.
 *
 * <p><b>Approved leave warns; it does not block.</b> Owner decision, 2026-08-21, closing open
 * question 4. Nothing on the server refuses a round over granted leave, and an administrator may
 * legitimately assign one having spoken to the person — so the form reads the target's absences and
 * says so, and the administrator decides. The conflict rule stays one-directional: rounds block
 * approval, leave only warns.
 */
@Component({
  standalone: true,
  selector: 'hpd-round-builder',
  imports: [ReactiveFormsModule, TranslateModule],
  template: `
    <section class="overflow-hidden rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" data-cy="rosterAdmin">
      <h2 class="m-0 border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted">
        {{ 'healthConnect.roster.administer' | translate }}
      </h2>

      <div class="grid gap-5 p-5">
        <form class="grid gap-4" [formGroup]="form" (ngSubmit)="assign()">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label class="hpd-label" for="dr-professional">{{ 'healthConnect.roster.professionalId' | translate }}</label>
              <input id="dr-professional" class="hpd-focusable hpd-input" formControlName="professionalId" data-cy="assignProfessionalId" />
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
          </div>

          @if (leaveWarning(); as warning) {
            <!--
              Advice, not a gate. Open question 4 was settled as "warn, do not block": an administrator
              may legitimately roster somebody over agreed leave, and making that cost a deletion and a
              re-creation would lose the record of why they were off.
            -->
            <p class="m-0 rounded-hpd-sm bg-hpd-roster-holiday/70 px-3 py-2 text-xs text-hpd-roster-holiday-accent" data-cy="leaveWarning">
              {{ 'healthConnect.roster.builder.onLeave' | translate: { from: warning.fromDate, to: warning.toDate } }}
            </p>
          }

          <fieldset class="grid gap-2 rounded-hpd-sm border border-hpd-border p-3">
            <legend class="px-1 text-[11px] font-bold uppercase tracking-wider text-hpd-muted">
              {{ 'healthConnect.roster.builder.visits' | translate }}
            </legend>
            @for (row of visits.controls; track $index) {
              <div class="grid gap-2 sm:grid-cols-4" [formGroup]="row" [attr.data-cy]="'visitRow-' + $index">
                <input
                  class="hpd-focusable hpd-input"
                  formControlName="customerId"
                  [attr.aria-label]="'healthConnect.roster.builder.customerId' | translate"
                  [attr.placeholder]="'healthConnect.roster.builder.customerId' | translate"
                  [attr.data-cy]="'visitCustomer-' + $index"
                />
                <input
                  class="hpd-focusable hpd-input"
                  type="time"
                  formControlName="startTime"
                  [attr.aria-label]="'healthConnect.roster.builder.startTime' | translate"
                  [attr.data-cy]="'visitStart-' + $index"
                />
                <input
                  class="hpd-focusable hpd-input"
                  type="time"
                  formControlName="endTime"
                  [attr.aria-label]="'healthConnect.roster.builder.endTime' | translate"
                  [attr.data-cy]="'visitEnd-' + $index"
                />
                <button
                  class="hpd-focusable hpd-btn hpd-btn-ghost !text-xs"
                  type="button"
                  [attr.data-cy]="'visitRemove-' + $index"
                  (click)="removeVisit($index)"
                >
                  {{ 'healthConnect.roster.builder.removeVisit' | translate }}
                </button>
              </div>
            } @empty {
              <!-- A shift with no visits is valid and ordinary — § 4 says so explicitly. -->
              <p class="m-0 text-xs text-hpd-subtle" data-cy="noVisitRows">{{ 'healthConnect.roster.builder.noVisits' | translate }}</p>
            }
            <button
              class="hpd-focusable hpd-btn hpd-btn-ghost !text-xs justify-self-start"
              type="button"
              data-cy="addVisit"
              (click)="addVisit()"
            >
              {{ 'healthConnect.roster.builder.addVisit' | translate }}
            </button>
          </fieldset>

          @if (error(); as message) {
            <!--
              The server's own message, verbatim. It names which of four rules was broken — window,
              ordering, in-round overlap, or a clash with another round — and each has a different fix.
            -->
            <p class="m-0 text-sm text-hpd-danger" role="alert" data-cy="assignError">{{ message }}</p>
          }

          <button class="hpd-focusable hpd-btn hpd-btn-primary justify-self-start" type="submit" [disabled]="busy()" data-cy="assignSubmit">
            {{ 'healthConnect.roster.assign' | translate }}
          </button>
        </form>

        <ul class="m-0 grid list-none gap-2 p-0" data-cy="allAssignments">
          @for (assignment of allAssignments(); track assignment.id) {
            <li class="grid gap-2 rounded-hpd-sm border border-hpd-border px-3.5 py-2.5 text-sm">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <span class="min-w-0 truncate text-hpd-primary-dark">
                  {{ assignment.date }} · {{ assignment.name }} · {{ assignment.professionalId }}
                  <span class="text-hpd-muted">({{ 'healthConnect.roster.duties.' + assignment.duty | translate }})</span>
                </span>
                <span class="flex items-center gap-2">
                  <span class="rounded-full bg-hpd-cream px-2.5 py-0.5 text-[11px] font-bold text-hpd-primary">
                    {{ 'healthConnect.roster.shiftNames.' + assignment.shift | translate }}
                  </span>
                  <button
                    class="hpd-focusable hpd-btn hpd-btn-ghost !px-2.5 !py-1 !text-xs"
                    type="button"
                    [attr.aria-expanded]="isReassigning(assignment.id)"
                    [attr.data-cy]="'reassignToggle-' + assignment.id"
                    (click)="toggleReassign(assignment.id)"
                  >
                    {{ 'healthConnect.roster.builder.reassign' | translate }}
                  </button>
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
              </div>

              @if (isReassigning(assignment.id)) {
                <div class="grid gap-2 rounded-hpd-sm bg-hpd-cream/60 p-3" [attr.data-cy]="'reassign-' + assignment.id">
                  <label class="hpd-label" [attr.for]="'reassign-target-' + assignment.id">
                    {{ 'healthConnect.roster.builder.reassignTo' | translate }}
                  </label>
                  <input
                    class="hpd-focusable hpd-input"
                    [id]="'reassign-target-' + assignment.id"
                    [value]="reassignTarget()"
                    [attr.data-cy]="'reassignTarget-' + assignment.id"
                    (input)="reassignTarget.set($any($event.target).value)"
                  />
                  <div class="flex flex-wrap gap-2">
                    <!--
                      Whole round by default: the customers, their times and their order are a coherent
                      plan, and moving them together in one auditable action is what § 8 asks for.
                    -->
                    <button
                      class="hpd-focusable hpd-btn hpd-btn-primary !px-2.5 !py-1 !text-xs"
                      type="button"
                      [disabled]="busy() || !reassignTarget()"
                      [attr.data-cy]="'reassignRound-' + assignment.id"
                      (click)="reassignRound(assignment)"
                    >
                      {{ 'healthConnect.roster.builder.reassignRound' | translate }}
                    </button>
                    @for (visit of assignment.visits ?? []; track visit.id) {
                      <!-- The fallback, for when one person cannot take the whole round. -->
                      <button
                        class="hpd-focusable hpd-btn hpd-btn-ghost !px-2.5 !py-1 !text-xs"
                        type="button"
                        [disabled]="busy() || !reassignTarget() || !visit.id"
                        [attr.data-cy]="'reassignVisit-' + visit.id"
                        (click)="reassignVisit(assignment, visit)"
                      >
                        {{ 'healthConnect.roster.builder.reassignVisit' | translate: { time: visit.startTime } }}
                      </button>
                    }
                  </div>
                  @if (reassignError(); as message) {
                    <p class="m-0 text-xs text-hpd-danger" role="alert" [attr.data-cy]="'reassignError-' + assignment.id">{{ message }}</p>
                  }
                </div>
              }
            </li>
          } @empty {
            <li class="py-3 text-center text-sm text-hpd-subtle">{{ 'healthConnect.states.empty' | translate }}</li>
          }
        </ul>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoundBuilderComponent implements OnInit {
  private readonly rosterService = inject(DutyRosterAssignmentsService);
  private readonly absenceService = inject(AbsenceApiService);
  private readonly alertService = inject(AlertService);

  readonly shifts = SHIFTS;
  readonly duties = DUTIES;
  readonly allAssignments = signal<DutyRosterAssignmentDto[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly reassignError = signal<string | null>(null);
  readonly reassignTarget = signal('');
  readonly leave = signal<AbsenceDto[]>([]);

  private readonly reassigningId = signal<string | null>(null);

  readonly form = new FormGroup({
    professionalId: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    date: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    shift: new FormControl<DutyRosterShift>('DAY', { nonNullable: true, validators: Validators.required }),
    duty: new FormControl<string>('NURSE', { nonNullable: true, validators: Validators.required }),
    name: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    visits: new FormArray<FormGroup>([]),
  });

  readonly leaveWarning = computed(() => this.leave()[0]);

  get visits(): FormArray<FormGroup> {
    return this.form.controls.visits;
  }

  ngOnInit(): void {
    this.refresh();
    // Re-checked whenever the professional or the date changes — those are the two inputs the answer
    // depends on, and checking on every keystroke of the ward name would be a request per character.
    this.form.controls.professionalId.valueChanges.subscribe(() => this.checkLeave());
    this.form.controls.date.valueChanges.subscribe(() => this.checkLeave());
  }

  isReassigning(id: string | undefined): boolean {
    return !!id && this.reassigningId() === id;
  }

  toggleReassign(id: string | undefined): void {
    this.reassignError.set(null);
    this.reassigningId.set(this.isReassigning(id) ? null : id ?? null);
  }

  addVisit(): void {
    this.visits.push(visitGroup());
  }

  removeVisit(index: number): void {
    this.visits.removeAt(index);
  }

  assign(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { professionalId, date, shift, duty, name } = this.form.getRawValue();
    const visits: VisitDto[] = this.visits.controls.map(row => row.getRawValue() as VisitDto);
    this.busy.set(true);
    this.error.set(null);
    this.rosterService.assign({ professionalId, date, shift, duty, name, visits }).subscribe({
      next: () => {
        this.busy.set(false);
        this.visits.clear();
        this.form.reset({ shift: 'DAY', duty: 'NURSE' });
        this.leave.set([]);
        this.alertService.showToast('healthConnect.toast.rosterUpdated');
        this.refresh();
      },
      error: response => {
        this.busy.set(false);
        this.error.set(typeof response?.error === 'string' ? response.error : null);
      },
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
        this.refresh();
      },
      error: () => this.busy.set(false),
    });
  }

  reassignRound(assignment: DutyRosterAssignmentDto): void {
    if (!assignment.id) {
      return;
    }
    this.runReassign(this.rosterService.reassignRound(assignment.id, this.reassignTarget()));
  }

  reassignVisit(assignment: DutyRosterAssignmentDto, visit: VisitDto): void {
    if (!assignment.id || !visit.id) {
      return;
    }
    this.runReassign(this.rosterService.reassignVisit(assignment.id, visit.id, this.reassignTarget()));
  }

  private runReassign(request: ReturnType<DutyRosterAssignmentsService['reassignRound']>): void {
    this.busy.set(true);
    this.reassignError.set(null);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.reassigningId.set(null);
        this.reassignTarget.set('');
        this.alertService.showToast('healthConnect.toast.rosterUpdated');
        this.refresh();
      },
      // A 400 here is a double-booking of the *target*, or an unknown professional id. Both are
      // things the administrator can see and fix by picking someone else, which is why the server
      // answers 400 rather than 409.
      error: response => {
        this.busy.set(false);
        this.reassignError.set(typeof response?.error === 'string' ? response.error : null);
      },
    });
  }

  private checkLeave(): void {
    const professionalId = this.form.controls.professionalId.value;
    const date = this.form.controls.date.value;
    if (!professionalId || !date) {
      this.leave.set([]);
      return;
    }
    // The round is one date, so the range is that date on both ends; the endpoint matches overlap, so
    // a holiday that started last week and runs through this date is still returned.
    this.absenceService.forProfessional(professionalId, date, date).subscribe({
      next: absences => this.leave.set(absences.filter(absence => absence.status === 'APPROVED')),
      error: () => this.leave.set([]),
    });
  }

  private refresh(): void {
    this.rosterService.listAll().subscribe({
      next: assignments => this.allAssignments.set(assignments),
      error: () => this.allAssignments.set([]),
    });
  }
}
