import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { AlertService } from 'app/core/util/alert.service';

import { AbsenceApiService, AbsenceDto, AbsenceType } from '../api/absence-api.service';
import { todayIsoDate } from './calendar-date.util';

/** Offered in the order a clinician reaches for them. OTHER absorbs everything else by design. */
const TYPES: readonly AbsenceType[] = ['HOLIDAY', 'SICK', 'OTHER'];

/**
 * A professional's own time off (docs/duty-roster.md § 8, DR8): request, see, withdraw.
 *
 * <p><b>This is the first and only write a professional has against their own roster</b>, and it is a
 * deliberate, scoped exception to the assignment-only policy rather than a softening of it. They ask;
 * only a roster administrator grants. Nothing here assigns, unassigns or reassigns anything.
 *
 * <p><b>The form sends dates and a type, and nothing else.</b> The server ignores a `professionalId`
 * or a `status` from a non-administrator and forces both onto the caller — so sending them would be
 * inert, and a client that *appears* to choose whose absence it is, or that it is already approved,
 * invites the next reader to believe it can.
 *
 * <p><b>No backdating, enforced here as well as on the server.</b> The `min` on the date inputs is
 * today; the server refuses an earlier start with a 400 regardless. This is not defence in depth so
 * much as courtesy — the rule exists because a day already worked cannot become a day off, and
 * finding that out after submitting is worse than not being offered it. **Retrospective sickness is
 * an administrator's to record**, over the phone at 06:00, which is why the copy says so rather than
 * leaving the clinician to guess why yesterday is greyed out.
 *
 * <p><b>Withdrawal is only offered while a request is pending.</b> Once granted, cover may already
 * have been arranged around it, so coming back is a conversation with the roster administrator rather
 * than a button — and the server refuses it too.
 */
@Component({
  standalone: true,
  selector: 'hpd-absence-panel',
  imports: [ReactiveFormsModule, TranslateModule],
  template: `
    <section class="overflow-hidden rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" data-cy="absencePanel">
      <h2 class="m-0 border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted">
        {{ 'healthConnect.roster.absence.title' | translate }}
      </h2>

      <form class="grid gap-4 p-5 sm:grid-cols-4" [formGroup]="form" (ngSubmit)="submit()">
        <div>
          <label class="hpd-label" for="abs-from">{{ 'healthConnect.roster.absence.from' | translate }}</label>
          <input id="abs-from" class="hpd-focusable hpd-input" type="date" [min]="today" formControlName="fromDate" data-cy="absenceFrom" />
        </div>
        <div>
          <label class="hpd-label" for="abs-to">{{ 'healthConnect.roster.absence.to' | translate }}</label>
          <input id="abs-to" class="hpd-focusable hpd-input" type="date" [min]="today" formControlName="toDate" data-cy="absenceTo" />
        </div>
        <div>
          <label class="hpd-label" for="abs-type">{{ 'healthConnect.roster.absence.type' | translate }}</label>
          <select id="abs-type" class="hpd-focusable hpd-input" formControlName="type" data-cy="absenceType">
            @for (type of types; track type) {
              <option [value]="type">{{ 'healthConnect.roster.calendar.absenceTypes.' + type | translate }}</option>
            }
          </select>
        </div>
        <div class="flex items-end">
          <button class="hpd-focusable hpd-btn hpd-btn-primary" type="submit" [disabled]="busy()" data-cy="absenceSubmit">
            {{ 'healthConnect.roster.absence.request' | translate }}
          </button>
        </div>

        @if (error(); as message) {
          <p class="m-0 text-sm text-hpd-danger sm:col-span-4" role="alert" data-cy="absenceError">{{ message }}</p>
        }
        <p class="m-0 text-xs text-hpd-muted sm:col-span-4">{{ 'healthConnect.roster.absence.noBackdating' | translate }}</p>
      </form>

      <ul class="m-0 grid list-none gap-2 border-t border-hpd-border p-5" data-cy="absenceList">
        @for (absence of absences(); track absence.id) {
          <li class="flex flex-wrap items-center justify-between gap-3 rounded-hpd-sm border border-hpd-border px-3.5 py-2.5 text-sm">
            <span class="min-w-0 text-hpd-primary-dark">
              {{ absence.fromDate }} – {{ absence.toDate }}
              <span class="text-hpd-muted">({{ 'healthConnect.roster.calendar.absenceTypes.' + absence.type | translate }})</span>
            </span>
            <span class="flex items-center gap-2">
              <!--
                REQUESTED renders hatched here as it does in the calendar, so "asked for" and "granted"
                look the same in both places. A person turning up, or not turning up, on the strength
                of a fill is what getting this wrong costs.
              -->
              <span
                class="rounded-full border border-hpd-border px-2.5 py-0.5 text-[11px] font-bold"
                [class]="statusClass(absence)"
                [attr.data-cy]="'absenceStatus-' + absence.id"
              >
                {{ 'healthConnect.roster.absence.statuses.' + absence.status | translate }}
              </span>
              @if (absence.status === 'REQUESTED') {
                <button
                  class="hpd-focusable hpd-btn hpd-btn-danger !px-2.5 !py-1 !text-xs"
                  type="button"
                  [disabled]="busy()"
                  [attr.data-cy]="'absenceWithdraw-' + absence.id"
                  (click)="withdraw(absence)"
                >
                  {{ 'healthConnect.roster.absence.withdraw' | translate }}
                </button>
              }
            </span>
          </li>
        } @empty {
          <li class="py-3 text-center text-sm text-hpd-subtle" data-cy="noAbsences">
            {{ 'healthConnect.roster.absence.none' | translate }}
          </li>
        }
      </ul>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbsencePanelComponent implements OnInit {
  private readonly absenceService = inject(AbsenceApiService);
  private readonly alertService = inject(AlertService);

  readonly types = TYPES;
  readonly today = todayIsoDate();
  readonly absences = signal<AbsenceDto[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup({
    fromDate: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    toDate: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    type: new FormControl<AbsenceType>('HOLIDAY', { nonNullable: true, validators: Validators.required }),
  });

  ngOnInit(): void {
    this.refresh();
  }

  statusClass(absence: AbsenceDto): string {
    // Literal class names — Tailwind scans source text, so an assembled one is never emitted.
    return absence.status === 'APPROVED'
      ? 'bg-hpd-roster-holiday text-hpd-roster-holiday-accent'
      : 'hpd-roster-pending bg-hpd-roster-holiday text-hpd-roster-holiday-accent';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fromDate, toDate, type } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.absenceService.request({ fromDate, toDate, type }).subscribe({
      next: () => {
        this.busy.set(false);
        this.form.reset({ fromDate: '', toDate: '', type: 'HOLIDAY' });
        this.alertService.showToast('healthConnect.roster.absence.requested');
        this.refresh();
      },
      // The server's message is shown verbatim rather than replaced by a generic one: it distinguishes
      // a backdated start from a reversed range from a missing type, and each has a different fix.
      error: response => {
        this.busy.set(false);
        this.error.set(typeof response?.error === 'string' ? response.error : null);
      },
    });
  }

  withdraw(absence: AbsenceDto): void {
    if (!absence.id) {
      return;
    }
    this.busy.set(true);
    this.absenceService.remove(absence.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.alertService.showToast('healthConnect.roster.absence.withdrawn');
        this.refresh();
      },
      error: () => this.busy.set(false),
    });
  }

  private refresh(): void {
    this.absenceService.own().subscribe({
      next: absences => this.absences.set(absences),
      error: () => this.absences.set([]),
    });
  }
}
