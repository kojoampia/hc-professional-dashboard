import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

import { ActivityLogEntryDto } from '../api/patient-api.model';
import { DutyRosterAssignmentDto, DutyRosterAssignmentsService, VisitDto } from '../api/duty-roster-assignments.service';
import { DutyRosterShift } from '../health-connect.models';

/** What the trail panel for one customer is currently showing. */
type TrailState = 'loading' | 'ready' | 'forbidden' | 'error';

interface TrailPanel {
  state: TrailState;
  entries: ActivityLogEntryDto[];
}

interface DayRound {
  id: string;
  name: string;
  shift: DutyRosterShift;
  duty: string;
  description?: string | null;
  visits: VisitDto[];
}

/**
 * The day popup (docs/duty-roster.md § 9, DR6): a day's rounds, their visits ordered by the hour, and
 * each customer's recent activity trail.
 *
 * <p><b>This is the only screen in the portal that shows a patient's name, address and phone.</b>
 * Everything else works in identifiers. Three things follow from that and none of them is optional.
 *
 * <p><b>1. It fetches its own day, and only when opened.</b> The calendar's range read draws shift
 * names and colours; it never receives a customer. Six weeks of addresses shipped to a browser to
 * render coloured squares would be exactly the kind of leak § 6 warns about, so the day view has its
 * own endpoint — which is also where the server refreshes the stored snapshots.
 *
 * <p><b>2. A missing snapshot is a normal state, not a loading failure.</b> The 90-day retention
 * sweep clears name, address and phone while keeping `customerId`, so an old round legitimately has
 * visits with times and no customer. It renders as "details no longer held" rather than as a blank or
 * a spinner that never resolves.
 *
 * <p><b>3. A 403 on the trail is not an empty list.</b> The entitlement is the caller's own roster
 * within ±30 days, so a customer on a round outside that window is refused — and "nothing happened
 * this week" and "you may not look" are different answers. Collapsing the second into the first would
 * hide an authorization failure behind a plausible blank panel, which is the specific mistake § 7
 * calls out.
 */
@Component({
  standalone: true,
  selector: 'hpd-day-list',
  imports: [TranslateModule],
  template: `
    <section class="fixed inset-0 z-[1050] grid place-items-center bg-black/50 p-4" data-cy="dayPopup" (click)="closeFromBackdrop($event)">
      <div
        #dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="hpd-day-title"
        class="grid max-h-[85vh] w-full max-w-2xl gap-4 overflow-y-auto rounded-hpd-lg bg-white p-6 text-hpd-primary-dark shadow-2xl"
        tabindex="-1"
        (keydown.escape)="closed.emit()"
        (keydown.tab)="trapFocus($event)"
      >
        <header class="flex items-start justify-between gap-3">
          <h2 id="hpd-day-title" class="m-0 text-lg font-bold">{{ heading() }}</h2>
          <button
            #firstControl
            type="button"
            class="hpd-focusable hpd-btn hpd-btn-ghost !px-3 !py-1 !text-xs"
            data-cy="dayPopupClose"
            (click)="closed.emit()"
          >
            {{ 'healthConnect.roster.calendar.day.close' | translate }}
          </button>
        </header>

        @if (loading()) {
          <p class="m-0 text-sm text-hpd-muted" data-cy="dayLoading">{{ 'healthConnect.states.loading' | translate }}</p>
        } @else if (failed()) {
          <p class="m-0 text-sm text-hpd-danger" role="alert" data-cy="dayError">
            {{ 'healthConnect.roster.calendar.day.loadFailed' | translate }}
          </p>
        } @else {
          @for (round of rounds(); track round.id) {
            <article class="rounded-hpd border border-hpd-border" [attr.data-cy]="'dayRound-' + round.id">
              <h3 class="m-0 flex flex-wrap items-baseline gap-x-2 border-b border-hpd-border bg-hpd-cream px-4 py-2 text-sm font-bold">
                <span>{{ round.name }}</span>
                <span class="text-xs font-semibold text-hpd-muted">
                  {{ 'healthConnect.roster.calendar.shiftShort.' + round.shift | translate }} ·
                  {{ 'healthConnect.roster.calendar.shiftWindow.' + round.shift | translate }}
                </span>
                <span class="text-xs font-normal text-hpd-subtle">
                  {{ 'healthConnect.roster.duties.' + round.duty | translate }}
                </span>
              </h3>

              @if (round.description) {
                <p class="m-0 border-b border-hpd-border px-4 py-2 text-xs text-hpd-muted">{{ round.description }}</p>
              }

              <ul class="m-0 grid list-none gap-0 p-0">
                @for (visit of round.visits; track visit.id ?? visit.customerId + visit.startTime) {
                  <li class="border-b border-hpd-border px-4 py-3 last:border-b-0">
                    <div class="flex flex-wrap items-baseline justify-between gap-2">
                      <span class="font-semibold tabular-nums">{{ visit.startTime }}–{{ visit.endTime }}</span>
                      <button
                        type="button"
                        class="hpd-focusable hpd-btn hpd-btn-ghost !px-2.5 !py-0.5 !text-xs"
                        [attr.aria-expanded]="isTrailOpen(visit.customerId)"
                        [attr.data-cy]="'trailToggle-' + visit.customerId"
                        (click)="toggleTrail(visit.customerId)"
                      >
                        {{ 'healthConnect.roster.calendar.day.trail' | translate }}
                      </button>
                    </div>

                    @if (visit.customerName || visit.customerAddress || visit.customerPhone) {
                      <p class="m-0 mt-1 text-sm">{{ visit.customerName }}</p>
                      @if (visit.customerAddress) {
                        <p class="m-0 text-xs text-hpd-muted">{{ visit.customerAddress }}</p>
                      }
                      @if (visit.customerPhone) {
                        <a class="hpd-focusable text-xs font-semibold text-hpd-primary underline" [href]="'tel:' + visit.customerPhone">
                          {{ visit.customerPhone }}
                        </a>
                      }
                    } @else {
                      <!--
                        Not a failure. The 90-day sweep clears the snapshot and keeps the id, so an
                        old round genuinely has no customer to show, and saying so is better than a
                        blank line the reader has to interpret.
                      -->
                      <p class="m-0 mt-1 text-xs italic text-hpd-subtle" [attr.data-cy]="'noSnapshot-' + visit.customerId">
                        {{ 'healthConnect.roster.calendar.day.detailsNotHeld' | translate }}
                      </p>
                    }

                    @if (isTrailOpen(visit.customerId)) {
                      <div class="mt-2 rounded-hpd-sm bg-hpd-cream/60 p-3" [attr.data-cy]="'trail-' + visit.customerId">
                        @switch (trailFor(visit.customerId).state) {
                          @case ('loading') {
                            <p class="m-0 text-xs text-hpd-muted">{{ 'healthConnect.states.loading' | translate }}</p>
                          }
                          @case ('forbidden') {
                            <!--
                              A 403, said plainly. Rendering it as "no recent activity" would hide an
                              authorization boundary behind a plausible blank panel (§ 7).
                            -->
                            <p class="m-0 text-xs text-hpd-muted" [attr.data-cy]="'trailForbidden-' + visit.customerId">
                              {{ 'healthConnect.roster.calendar.day.trailForbidden' | translate }}
                            </p>
                          }
                          @case ('error') {
                            <p class="m-0 text-xs text-hpd-danger" role="alert">
                              {{ 'healthConnect.roster.calendar.day.trailFailed' | translate }}
                            </p>
                          }
                          @default {
                            <ul class="m-0 grid list-none gap-2 p-0">
                              @for (entry of trailFor(visit.customerId).entries; track entry.id) {
                                <li class="text-xs">
                                  <span class="font-semibold">{{ entry.title }}</span>
                                  <span class="text-hpd-subtle"> · {{ entry.occurredAt }}</span>
                                  @if (entry.description) {
                                    <span class="block text-hpd-muted">{{ entry.description }}</span>
                                  }
                                </li>
                              } @empty {
                                <li class="text-xs text-hpd-muted">{{ 'healthConnect.roster.calendar.day.trailEmpty' | translate }}</li>
                              }
                            </ul>
                          }
                        }
                      </div>
                    }
                  </li>
                } @empty {
                  <!--
                    A shift with no visits is valid and ordinary — ward cover, on call, administrative
                    time (§ 4). It is listed by its window alone.
                  -->
                  <li class="px-4 py-3 text-sm text-hpd-subtle" data-cy="roundWithoutVisits">
                    {{ 'healthConnect.roster.calendar.day.noVisits' | translate }}
                  </li>
                }
              </ul>
            </article>
          } @empty {
            <p class="m-0 text-sm text-hpd-subtle" data-cy="dayEmpty">{{ 'healthConnect.roster.calendar.day.nothing' | translate }}</p>
          }
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayListComponent implements AfterViewInit {
  private readonly rosterService = inject(DutyRosterAssignmentsService);

  readonly date = input.required<string>();
  /** The date already formatted by the parent — this component does no locale work of its own. */
  readonly heading = input.required<string>();
  readonly closed = output<void>();

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly rounds = signal<DayRound[]>([]);

  private readonly openTrails = signal<Record<string, TrailPanel | undefined>>({});

  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;

  constructor() {
    // Read once, on open. The day is fixed for the lifetime of this component — the parent destroys
    // and recreates it to show a different one — so there is nothing to react to.
    queueMicrotask(() => this.load());
  }

  /**
   * Move focus into the dialog once it exists.
   *
   * <p>Not in the constructor, where `@ViewChild` is still undefined and the call would silently do
   * nothing. **A modal that opens without taking focus leaves a keyboard user outside it**, tabbing
   * through the calendar behind a backdrop they cannot see, with the focus trap below never getting
   * a chance to run — the trap only helps once focus is inside.
   */
  ngAfterViewInit(): void {
    this.dialog?.nativeElement.focus();
  }

  isTrailOpen(customerId: string): boolean {
    return this.openTrails()[customerId] !== undefined;
  }

  trailFor(customerId: string): TrailPanel {
    return this.openTrails()[customerId] ?? { state: 'loading', entries: [] };
  }

  /**
   * Open or close one customer's trail.
   *
   * <p>Fetched on expand rather than with the day, because a round may hold half a dozen customers
   * and the trail is a cross-stack read each — loading all of them to show one is the burst § 6 warns
   * about, in the one place a clinician has not asked for it. Closing discards the panel, so
   * reopening re-reads; that is the right way round for data whose whole purpose is to be current.
   */
  toggleTrail(customerId: string): void {
    if (this.isTrailOpen(customerId)) {
      this.openTrails.update(panels => ({ ...panels, [customerId]: undefined }));
      return;
    }
    this.openTrails.update(panels => ({ ...panels, [customerId]: { state: 'loading', entries: [] } }));
    this.rosterService.customerTrail(customerId).subscribe({
      next: entries => this.setTrail(customerId, { state: 'ready', entries }),
      error: (response: HttpErrorResponse) =>
        // 403 is the roster boundary and has its own wording; anything else is a failure to read.
        this.setTrail(customerId, { state: response.status === 403 ? 'forbidden' : 'error', entries: [] }),
    });
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  /**
   * Keep Tab inside the dialog.
   *
   * <p>Mirrors `activity-log-dialog`, which is the pattern already in this repo. A modal that lets
   * focus escape puts a screen-reader user behind the backdrop with no way back and no indication
   * anything is in front of them.
   */
  trapFocus(event: Event): void {
    // `Event`, not `KeyboardEvent`: Angular types `(keydown.tab)` as the base Event, and narrowing
    // the parameter is a template type error rather than a stricter contract. `activity-log-dialog`
    // takes the same shape for the same reason.
    const { shiftKey } = event as KeyboardEvent;
    const focusable = this.dialog?.nativeElement.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) {
      return;
    }
    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);
    if (shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private setTrail(customerId: string, panel: TrailPanel): void {
    // Only if it is still open — a clinician who collapsed the panel before the response landed did
    // so deliberately, and reopening it under them would be its own small betrayal.
    if (this.isTrailOpen(customerId)) {
      this.openTrails.update(panels => ({ ...panels, [customerId]: panel }));
    }
  }

  private load(): void {
    this.rosterService.day(this.date()).subscribe({
      next: rounds => {
        this.rounds.set(rounds.map(round => this.toDayRound(round)));
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  private toDayRound(round: DutyRosterAssignmentDto): DayRound {
    return {
      id: round.id ?? `${round.date}-${round.shift}`,
      name: round.name,
      shift: round.shift,
      duty: round.duty,
      description: round.description,
      // "Ordered by the hour and customer", per fix.md. The server does not promise an order, and a
      // round read back in insertion order sends a clinician up and down the same street.
      visits: [...(round.visits ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime) || compareCustomer(a, b)),
    };
  }
}

/** Tie-break for two visits at the same minute: by name where known, else by id, so it is stable. */
const compareCustomer = (a: VisitDto, b: VisitDto): number =>
  (a.customerName ?? a.customerId).localeCompare(b.customerName ?? b.customerId);
