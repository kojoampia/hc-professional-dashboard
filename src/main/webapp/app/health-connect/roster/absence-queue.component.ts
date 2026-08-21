import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

import { AlertService } from 'app/core/util/alert.service';

import { AbsenceApiService, AbsenceConflict, AbsenceDto } from '../api/absence-api.service';

/**
 * The roster administrator's absence approval queue (docs/duty-roster.md § 8, DR8).
 *
 * <p><b>The 409 is the whole point of this screen, not an error case in it.</b> Approval is refused
 * while the professional is still rostered on days inside the absence, and the response names the
 * rounds in the way — so cover is arranged *before* leave is granted rather than discovered by
 * whoever opens the roster next. The queue therefore renders a refusal as a **worklist**: the
 * clashing round ids, and the reminder that reassigning them and retrying the same request unchanged
 * is the way through. Rendering it as a red banner saying "conflict" would throw away the only part
 * of the answer that helps.
 *
 * <p>**Pending first, and pending is the default filter.** Granted absences are still listed because
 * an administrator declining one after the fact is a real thing, but a queue that opens on everything
 * buries the four requests waiting under a year of settled ones.
 *
 * <p>Declining is deletion — there is no `REJECTED` status, deliberately. A rejected record that
 * lingers on a calendar is a day nobody can read: is it off, or not?
 */
@Component({
  standalone: true,
  selector: 'hpd-absence-queue',
  imports: [TranslateModule],
  template: `
    <section class="overflow-hidden rounded-hpd border border-hpd-border bg-white shadow-hpd-sm" data-cy="absenceQueue">
      <h2
        class="m-0 flex flex-wrap items-center justify-between gap-2 border-b border-hpd-border bg-hpd-cream px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-hpd-muted"
      >
        {{ 'healthConnect.roster.absence.queue' | translate }}
        <button
          type="button"
          class="hpd-focusable hpd-btn hpd-btn-ghost !px-3 !py-1 !text-[11px]"
          [attr.aria-pressed]="pendingOnly()"
          data-cy="absenceQueueFilter"
          (click)="pendingOnly.set(!pendingOnly())"
        >
          {{ (pendingOnly() ? 'healthConnect.roster.absence.showAll' : 'healthConnect.roster.absence.showPending') | translate }}
        </button>
      </h2>

      <ul class="m-0 grid list-none gap-2 p-5" data-cy="absenceQueueList">
        @for (absence of visible(); track absence.id) {
          <li class="grid gap-2 rounded-hpd-sm border border-hpd-border px-3.5 py-2.5 text-sm" [attr.data-cy]="'queueItem-' + absence.id">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <span class="min-w-0 text-hpd-primary-dark">
                {{ absence.fromDate }} – {{ absence.toDate }}
                <span class="text-hpd-muted"> ({{ 'healthConnect.roster.calendar.absenceTypes.' + absence.type | translate }}) </span>
                <span class="block text-xs text-hpd-subtle">{{ absence.professionalId }}</span>
              </span>
              <span class="flex items-center gap-2">
                <span class="rounded-full border border-hpd-border px-2.5 py-0.5 text-[11px] font-bold" [class]="statusClass(absence)">
                  {{ 'healthConnect.roster.absence.statuses.' + absence.status | translate }}
                </span>
                @if (absence.status === 'REQUESTED') {
                  <button
                    class="hpd-focusable hpd-btn hpd-btn-primary !px-2.5 !py-1 !text-xs"
                    type="button"
                    [disabled]="busy()"
                    [attr.data-cy]="'approve-' + absence.id"
                    (click)="approve(absence)"
                  >
                    {{ 'healthConnect.roster.absence.approve' | translate }}
                  </button>
                }
                <button
                  class="hpd-focusable hpd-btn hpd-btn-danger !px-2.5 !py-1 !text-xs"
                  type="button"
                  [disabled]="busy()"
                  [attr.data-cy]="'decline-' + absence.id"
                  (click)="decline(absence)"
                >
                  {{ 'healthConnect.roster.absence.decline' | translate }}
                </button>
              </span>
            </div>

            @if (conflictFor(absence.id); as conflict) {
              <!--
                A worklist, not a banner. The 409 names the rounds precisely so cover can be arranged,
                and the administrator reassigns those and retries this request unchanged.
              -->
              <div class="rounded-hpd-sm bg-hpd-roster-working/60 p-3 text-xs" role="alert" [attr.data-cy]="'conflict-' + absence.id">
                <p class="m-0 font-semibold">
                  {{ 'healthConnect.roster.absence.conflict' | translate: { count: conflict.conflictingRosterIds.length } }}
                </p>
                <ul class="m-0 mt-1 grid list-none gap-0.5 p-0">
                  @for (rosterId of conflict.conflictingRosterIds; track rosterId) {
                    <li class="font-mono">{{ rosterId }}</li>
                  }
                </ul>
                <p class="m-0 mt-1">{{ 'healthConnect.roster.absence.conflictHint' | translate }}</p>
              </div>
            }
          </li>
        } @empty {
          <li class="py-3 text-center text-sm text-hpd-subtle" data-cy="queueEmpty">
            {{ 'healthConnect.roster.absence.queueEmpty' | translate }}
          </li>
        }
      </ul>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbsenceQueueComponent implements OnInit {
  private readonly absenceService = inject(AbsenceApiService);
  private readonly alertService = inject(AlertService);

  readonly absences = signal<AbsenceDto[]>([]);
  readonly pendingOnly = signal(true);
  readonly busy = signal(false);
  private readonly conflicts = signal<Record<string, AbsenceConflict | undefined>>({});

  readonly visible = computed(() => {
    const all = this.absences();
    const rows = this.pendingOnly() ? all.filter(absence => absence.status === 'REQUESTED') : all;
    // Pending first, then by date. An administrator opens this to act, not to browse.
    return [...rows].sort(
      (a, b) => Number(b.status === 'REQUESTED') - Number(a.status === 'REQUESTED') || a.fromDate.localeCompare(b.fromDate),
    );
  });

  ngOnInit(): void {
    this.refresh();
  }

  conflictFor(id: string | undefined): AbsenceConflict | undefined {
    return id ? this.conflicts()[id] : undefined;
  }

  statusClass(absence: AbsenceDto): string {
    return absence.status === 'APPROVED'
      ? 'bg-hpd-roster-holiday text-hpd-roster-holiday-accent'
      : 'hpd-roster-pending bg-hpd-roster-holiday text-hpd-roster-holiday-accent';
  }

  approve(absence: AbsenceDto): void {
    if (!absence.id) {
      return;
    }
    const id = absence.id;
    this.busy.set(true);
    this.absenceService.approve(id).subscribe({
      next: () => {
        this.busy.set(false);
        this.setConflict(id, undefined);
        this.alertService.showToast('healthConnect.roster.absence.approved');
        this.refresh();
      },
      error: (response: HttpErrorResponse) => {
        this.busy.set(false);
        // Only a 409 carries a worklist. Anything else is an ordinary failure and keeps its banner.
        this.setConflict(id, response.status === 409 ? (response.error as AbsenceConflict) : undefined);
      },
    });
  }

  decline(absence: AbsenceDto): void {
    if (!absence.id) {
      return;
    }
    this.busy.set(true);
    this.absenceService.remove(absence.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.alertService.showToast('healthConnect.roster.absence.declined');
        this.refresh();
      },
      error: () => this.busy.set(false),
    });
  }

  private setConflict(id: string, conflict: AbsenceConflict | undefined): void {
    this.conflicts.update(current => ({ ...current, [id]: conflict }));
  }

  private refresh(): void {
    this.absenceService.all().subscribe({
      next: absences => this.absences.set(absences),
      error: () => this.absences.set([]),
    });
  }
}
