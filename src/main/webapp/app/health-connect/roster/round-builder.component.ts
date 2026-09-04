import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { AlertService } from 'app/core/util/alert.service';
import { ParseLinks } from 'app/core/util/parse-links.service';

import { AbsenceApiService, AbsenceDto } from '../api/absence-api.service';
import { DutyRosterAssignmentDto, DutyRosterAssignmentsService, VisitDto } from '../api/duty-roster-assignments.service';
import { DUTY_ROSTER_SHIFTS, DutyRosterShift } from '../health-connect.models';

/** The model's list, not a second copy — the assign form offers exactly the shifts the server has. */
const SHIFTS: readonly DutyRosterShift[] = DUTY_ROSTER_SHIFTS;
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
 * `X-Total-Count`, or **null when the server did not send one**.
 *
 * <p>Null is neither zero nor "however many rows arrived". The `/all` deployed today sends no count
 * at all, and reading its absence as a count would either invent a truncation or hide one; the two
 * cases are told apart in {@link RoundBuilderComponent.nextPageOf}, and only there.
 */
const readTotalCount = (response: HttpResponse<unknown>): number | null => {
  const header = response.headers.get(TOTAL_COUNT_RESPONSE_HEADER);
  if (header === null || header.trim() === '') {
    return null;
  }
  const total = Number(header);
  return Number.isFinite(total) ? total : null;
};

/**
 * Append `incoming` to `loaded`, dropping any row whose id is already on screen.
 *
 * <p>Belt and braces behind the epoch guard and behind `api/`'s `id` sort key: the estate list tracks
 * by `assignment.id` (`@for … track assignment.id`), and a duplicate id there is not a cosmetic
 * repeat. Each rendered copy carries a live *unassign* and *reassign* button, so an administrator can
 * delete a round from one copy and be looking at the other.
 *
 * <p>A row with no id cannot be deduplicated and is kept: it has nothing to collide on, and dropping
 * rows on a guess is the truncation this component exists to prevent.
 */
const appendUnique = (
  loaded: readonly DutyRosterAssignmentDto[],
  incoming: readonly DutyRosterAssignmentDto[],
): DutyRosterAssignmentDto[] => {
  const seen = new Set(loaded.map(assignment => assignment.id).filter((id): id is string => id !== undefined));
  const rows = [...loaded];
  for (const assignment of incoming) {
    if (assignment.id !== undefined) {
      if (seen.has(assignment.id)) {
        continue;
      }
      seen.add(assignment.id);
    }
    rows.push(assignment);
  }
  return rows;
};

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
 *
 * <p><b>The estate list is paged, and never truncates silently</b> (backlog.md item 13). `/all` used
 * to hand back every assignment the estate has ever had; `api/` `058ce46` bounded it to a `Page`, and
 * this list asked for no page and rendered whatever arrived — which after that change is the first
 * twenty rows and nothing to say so. **A short roster list and a truncated one look identical**, and
 * that is the failure this component is written against: whenever fewer rows are on screen than the
 * estate holds, the count and the load-more control are on screen with them.
 *
 * <p>A numbered pager was the other option and was rejected: `hpd-pagination` renders one button per
 * page, and this is precisely the collection item 7 says grows with the roster rather than with the
 * number of professionals — five hundred page buttons is a worse answer than the problem. Appending
 * also keeps the component's existing idiom, which is one flat list refreshed whole after every
 * mutation.
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
                  <option [value]="shift">{{ 'healthConnect.shiftType.' + shift | translate }}</option>
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

        <!--
          aria-busy while a page is in flight: the rows below are about to change under a screen
          reader that has no other way to know it, and the appended ones arrive with the focus still
          on the button that asked for them.
        -->
        <ul class="m-0 grid list-none gap-2 p-0" data-cy="allAssignments" [attr.aria-busy]="loadingMore()">
          @for (assignment of allAssignments(); track assignment.id) {
            <li class="grid gap-2 rounded-hpd-sm border border-hpd-border px-3.5 py-2.5 text-sm" data-cy="assignmentRow">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <span class="min-w-0 truncate text-hpd-primary-dark">
                  {{ assignment.date }} · {{ assignment.name }} · {{ assignment.professionalId }}
                  <span class="text-hpd-muted">({{ 'healthConnect.roster.duties.' + assignment.duty | translate }})</span>
                </span>
                <span class="flex items-center gap-2">
                  <span class="rounded-full bg-hpd-cream px-2.5 py-0.5 text-[11px] font-bold text-hpd-primary">
                    {{ 'healthConnect.shiftType.' + assignment.shift | translate }}
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

        @if (totalAssignments() || hasMore()) {
          <!--
            The anti-truncation surface. The estate read is bounded server-side (backlog.md items 7
            and 13), so the rows above are a page of the estate rather than the estate — and a page
            that says nothing is indistinguishable from a quiet week.
          -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-hpd-border pt-3">
            @if (totalAssignments(); as total) {
              <!--
                The count outlives the load-more control on purpose. It used to live inside the
                hasMore() block, so the live region vanished at the exact moment completion should
                have been announced: the last page appended twenty rows, the control disappeared, and
                nothing said "showing 57 of 57" — to a screen reader or to anybody else.

                aria-live is polite because appended rows are otherwise silent. Focus stays on the
                button, the list grows below it, and without this the only feedback is visual.
              -->
              <p class="m-0 text-xs text-hpd-muted" aria-live="polite" data-cy="rosterShowing">
                {{ 'healthConnect.roster.builder.showing' | translate: { shown: allAssignments().length, total: total } }}
              </p>
            }
            @if (hasMore()) {
              <div data-cy="rosterMore">
                <button
                  class="hpd-focusable hpd-btn hpd-btn-ghost !text-xs"
                  type="button"
                  [disabled]="loadingMore()"
                  data-cy="rosterLoadMore"
                  (click)="loadMore()"
                >
                  {{ 'healthConnect.roster.builder.loadMore' | translate }}
                </button>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoundBuilderComponent implements OnInit {
  private readonly rosterService = inject(DutyRosterAssignmentsService);
  private readonly absenceService = inject(AbsenceApiService);
  private readonly alertService = inject(AlertService);
  private readonly parseLinks = inject(ParseLinks);

  readonly shifts = SHIFTS;
  readonly duties = DUTIES;
  readonly allAssignments = signal<DutyRosterAssignmentDto[]>([]);
  /** The estate's real size from `X-Total-Count`; **null when the server did not say**, not zero. */
  readonly totalAssignments = signal<number | null>(null);
  /** A page of the estate list is in flight — the first one included, which is why it disables the control. */
  readonly loadingMore = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly reassignError = signal<string | null>(null);
  readonly reassignTarget = signal('');
  readonly leave = signal<AbsenceDto[]>([]);

  private readonly reassigningId = signal<string | null>(null);
  /** The next page to ask for, or null when what is loaded is the whole collection. */
  private readonly nextPage = signal<number | null>(null);

  /**
   * Which list the responses in flight belong to. **Incremented by every `refresh()`; a response
   * carrying an older number is dropped.**
   *
   * <p>Without it a mutation racing a slow "load more" puts the deleted round back on screen. Forty
   * rows are loaded, the administrator asks for page 2, and while it is in flight they unassign a
   * row: `refresh()` lands the fresh first page correctly, and then the slow page-2 response arrives
   * closed over the *old* forty rows — including the one that was just deleted — and sets the list to
   * those forty plus twenty. The count reverts to a stale total and `nextPage` is set from a context
   * that no longer exists, so the next "load more" asks for the wrong page as well.
   *
   * <p>An epoch rather than an unsubscribe because the request is already in flight either way and
   * the answer is not wanted, not merely unneeded; and it is what stops a stale response flipping
   * `loadingMore` false in the middle of the refresh it lost to.
   */
  private epoch = 0;

  /** Whether the estate holds rows this list has not loaded. Drives the whole anti-truncation block. */
  readonly hasMore = computed(() => this.nextPage() !== null);

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

  /**
   * Append the next page of the estate to the list.
   *
   * <p>Appends rather than replaces: the administrator is scanning for a round to move or remove, and
   * a control that swapped the rows underneath them would make finding one a game of chance.
   */
  loadMore(): void {
    const page = this.nextPage();
    if (page === null || this.loadingMore()) {
      return;
    }
    this.loadPage(page, this.allAssignments());
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

  /**
   * <p>**An empty target does nothing at all**, rather than being sent. The button is disabled without
   * one, so this is only reachable from code — but sending it earns a 400 naming an unknown
   * professional, which reads as a server problem rather than as an unfilled field, and the message is
   * shown to the administrator verbatim. Silent, like the missing-id guard beside it: there is nothing
   * to report about a form the user has not finished.
   */
  reassignRound(assignment: DutyRosterAssignmentDto): void {
    if (!assignment.id || !this.reassignTarget()) {
      return;
    }
    this.runReassign(this.rosterService.reassignRound(assignment.id, this.reassignTarget()));
  }

  reassignVisit(assignment: DutyRosterAssignmentDto, visit: VisitDto): void {
    if (!assignment.id || !visit.id || !this.reassignTarget()) {
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

  /**
   * Back to the first page.
   *
   * <p>Called after every mutation, and deliberately not "reload the pages we had": the round that
   * was just created or moved changes where the date-then-shift ordering puts every row after it, so
   * re-requesting page 3 would show a window that no longer means what it did. The count line says
   * how much was dropped.
   */
  private refresh(): void {
    // Opens a new epoch, so any page still in flight is answering about a list that no longer exists.
    this.epoch += 1;
    this.loadPage(0, []);
  }

  private loadPage(page: number, loaded: readonly DutyRosterAssignmentDto[]): void {
    const epoch = this.epoch;
    this.loadingMore.set(true);
    this.rosterService.listAll(page).subscribe({
      next: response => {
        if (epoch !== this.epoch) {
          return;
        }
        this.loadingMore.set(false);
        const rows = appendUnique(loaded, response.body ?? []);
        const total = readTotalCount(response);
        this.allAssignments.set(rows);
        this.totalAssignments.set(total);
        this.nextPage.set(this.nextPageOf(response, page, rows.length, total));
      },
      error: () => {
        if (epoch !== this.epoch) {
          return;
        }
        this.loadingMore.set(false);
        // A failed first page empties the list, as it always did. A failed later page keeps what is
        // already on screen and leaves `nextPage` where it was, so the control retries instead of
        // quietly turning into a shorter list — the failure this whole component guards against.
        if (page === 0) {
          this.allAssignments.set([]);
          this.totalAssignments.set(null);
          this.nextPage.set(null);
        }
      },
    });
  }

  /**
   * Where the "is there more" answer comes from, and the one place the old and new `/all` are told
   * apart.
   *
   * <p>The `Link` header is authoritative: it is the server saying a next page exists, and its `page`
   * is the one to ask for. `X-Total-Count` is the backstop for the case where a bounded answer
   * arrives without a `Link` — the count still proves rows are missing, and the safe reading of a
   * disagreement between the two headers is the one that offers to load more.
   *
   * <p><b>Neither header means the answer was complete.</b> That is what makes this work against the
   * `/all` deployed today, which takes no `Pageable` and hands back the whole estate: guessing at
   * page 1 there would fetch the estate a second time and append it to itself.
   */
  private nextPageOf(response: HttpResponse<unknown>, requested: number, loaded: number, total: number | null): number | null {
    const header = response.headers.get('Link');
    if (header) {
      try {
        const next = this.parseLinks.parse(header).next;
        // A `next` naming the page just requested would append this page to itself for ever, one
        // click at a time. `PaginationUtil` never emits that, so this is a guard against a header
        // rather than against a known bug — but it costs one comparison and the alternative is an
        // infinite list of duplicates that the id tracker then renders twice.
        if (next !== undefined && next !== requested) {
          return next;
        }
      } catch {
        // A Link header this parser cannot read is not a reason to declare the list complete; fall
        // through to the count, which is the more conservative of the two answers.
      }
    }
    return total !== null && loaded < total ? requested + 1 : null;
  }
}
