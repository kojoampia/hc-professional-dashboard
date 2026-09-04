import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ITEMS_PER_PAGE } from 'app/config/pagination.constants';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { DutyRosterShift, SHIFT_WINDOWS, ShiftLabel, shiftStartHour } from '../health-connect.models';
import { AbsenceStatus, AbsenceType } from './absence-api.service';
import { ActivityLogEntryDto } from './patient-api.model';

/**
 * Re-exported so callers of this adapter get the shift union from the adapter they already import.
 * It is *defined* in `health-connect.models`, not here — the mirror of
 * `api/domain/enumeration/ShiftType` is a cross-repo invariant and one copy of it in this repo is
 * hard enough to keep in step with the enum and the four i18n catalogues without a second.
 */
export type { DutyRosterShift };

/**
 * One visit inside a round (DR2), as the day view receives it.
 *
 * <p>`customerId` is the **patient stack's `Profile.patientId`**, not its profile id — the same
 * identifier the activity trail is asked for. The three snapshot fields are copied from `hc-patient`
 * when the round is built and refreshed when a day is opened, and they are **cleared after 90 days**
 * by the retention sweep, so a round older than that has ids and times and no customer. That is a
 * normal state to render, not a loading failure.
 *
 * <p>`id` exists only so a single visit can be named for reassignment (DR4). It carries no meaning
 * and is not a customer identifier — two visits to the same person on one day have different ids.
 *
 * <p>The three snapshot fields have always been optional here and, since `api/` `058ce46`, they are
 * **absent by construction** from every read but the day view: those go through a projection with no
 * field to put a name in. Keep them optional rather than dropping them — {@link day} is a real reader
 * of this interface and still receives them.
 */
export interface VisitDto {
  id?: string;
  customerId: string;
  /** `HH:mm[:ss]` local to the shift's date. NIGHT wraps: 01:00 belongs to the previous date's shift. */
  startTime: string;
  endTime: string;
  customerName?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
}

/**
 * One rostered or absent day, as the year summary returns it (`DutyRosterService.DaySummary`).
 *
 * <p><b>A day can carry both a round and an absence, and neither suppresses the other</b> — leave
 * asked for over a shift that has not been reassigned is precisely the day an administrator needs to
 * see, and it is what DR4's 409 refuses to approve. The year view colours it as leave and still
 * counts the shift.
 *
 * <p>Carries no customer: shift names and a visit count. That is what makes a year of it safe to hold
 * in a browser, unlike the day read.
 */
export interface DaySummaryDto {
  date: string;
  shifts: DutyRosterShift[];
  visits: number;
  absence: { type: AbsenceType; status: AbsenceStatus } | null;
}

export interface DutyRosterAssignmentDto {
  id?: string;
  date: string;
  duty: string;
  professionalId: string;
  shift: DutyRosterShift;
  name: string;
  description?: string | null;
  /**
   * Present on the day read (DR6) and on the write path's response; **absent from the range read's
   * and `/all`'s usable content**, which draw shift names and never render a customer. Treat it as
   * optional at every call site.
   */
  visits?: VisitDto[] | null;
  /**
   * Where the round is worked, as a `GeographicSpace` id **owned by hc-admin** (2026-09-04).
   *
   * <p>Opaque on this side, exactly as it is in `api/`: this product stores and returns the id and
   * models no tree. `GeographicSpaceApiService` turns it into a name for display, from hc-admin's
   * narrow read, and caches it.
   *
   * <p>Optional and absent on every round written before hc-admin's planner existed — a round with
   * no space is one nobody has said where to work, which is an ordinary state for one created
   * through this service's own admin write.
   */
  geographicSpaceId?: string | null;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Real duty-roster assignments API, against `/api/duty-roster` — the singular resource whose bare
 * GET is the caller's own roster (DR1; `/my` is gone, and the admin's whole-estate list moved to
 * `/all`). Drives the roster view and the sidebar shift label. Assignment-only policy:
 * professionals load their own assignments; administrators assign and unassign.
 */
@Injectable({ providedIn: 'root' })
export class DutyRosterAssignmentsService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/duty-roster', 'professionalservice');

  private readonly myAssignmentsState = signal<readonly DutyRosterAssignmentDto[]>([]);
  readonly myAssignments = computed(() => this.myAssignmentsState());

  /** Sidebar user-card label (WP6 gate): driven by real assignments. */
  readonly shiftLabel = computed<ShiftLabel | null>(() => this.computeShiftLabel(this.myAssignmentsState(), new Date()));

  loadMyAssignments(): void {
    this.http.get<DutyRosterAssignmentDto[]>(this.resourceUrl).subscribe({
      next: assignments => this.myAssignmentsState.set(assignments),
      error: () => this.myAssignmentsState.set([]),
    });
  }

  /**
   * The caller's own assignments between two inclusive ISO dates (DR2's optional bounds, DR5's
   * caller).
   *
   * <p>The calendar asks for the range it is about to draw rather than reusing
   * {@link loadMyAssignments}, whose unbounded result is right for the sidebar's "what am I on next"
   * and wrong for a grid: it grows without limit as a career accumulates, and every page of the
   * calendar would re-render the whole of it to show six weeks.
   *
   * <p>Both bounds are always sent. The endpoint accepts either alone, but an open-ended range has no
   * meaning to a bounded grid, and asking for one would quietly reintroduce the unbounded read.
   */
  range(from: string, to: string): Observable<DutyRosterAssignmentDto[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<DutyRosterAssignmentDto[]>(this.resourceUrl, { params });
  }

  /**
   * The caller's rounds for one date, with their customer snapshots refreshed server-side (DR6).
   *
   * <p><b>This is the only call that brings customer names, addresses and phone numbers into the
   * browser</b>, and it is made when a clinician deliberately opens a day. The range read draws a
   * grid of shift names and needs none of them, which is why the day view has its own endpoint rather
   * than filtering what the calendar already holds.
   */
  day(date: string): Observable<DutyRosterAssignmentDto[]> {
    return this.http.get<DutyRosterAssignmentDto[]>(`${this.resourceUrl}/day/${encodeURIComponent(date)}`);
  }

  /**
   * A customer's last 7 days of activity, if this clinician is entitled to see it (DR3).
   *
   * <p>The entitlement is the caller's own roster within ±30 days, checked server-side on every read.
   * **A 403 is not an empty list and must not be rendered as one** — "nothing happened this week" and
   * "you may not look" are different answers, and collapsing the second into the first hides an
   * authorization failure behind a plausible blank panel. The caller distinguishes them; this method
   * lets the error through rather than swallowing it, which is the opposite of what
   * `AbsenceApiService` does and deliberately so.
   */
  customerTrail(customerId: string): Observable<ActivityLogEntryDto[]> {
    return this.http.get<ActivityLogEntryDto[]>(`${this.resourceUrl}/customers/${encodeURIComponent(customerId)}/trail`);
  }

  /**
   * One record per day the caller has something on, for a whole year (DR2's endpoint, DR7's caller).
   *
   * <p><b>Days with nothing on them are absent from the result, and that is deliberate.</b> Returning
   * all 365 would make the empty days look like data and triple the payload to say nothing; a year
   * grid renders the gaps as off. Since DR4 an absent day *is* something, so approved leave appears
   * here with no shifts and no visits — which is exactly what the year view colours green.
   *
   * <p>One call for a year, against twelve range reads or 365 day reads. The summary carries no
   * customer at all — shift names and a visit count — which is what makes a year's worth of it safe
   * to hold in a browser.
   */
  summary(year: number): Observable<DaySummaryDto[]> {
    return this.http.get<DaySummaryDto[]>(`${this.resourceUrl}/summary`, { params: new HttpParams().set('year', year) });
  }

  /**
   * Every assignment on the estate, **one bounded page at a time** — the administrator's read.
   *
   * <p><b>Returns the response rather than the body, because the headers are the point.</b> `/all`
   * was an unbounded read until `api/` `058ce46` (backlog.md item 7) bounded it; it answers with a
   * `Page` now, so `X-Total-Count` is the collection's real count and `Link` carries
   * first/prev/next/last. A caller that reads only the body cannot tell a complete list from the
   * first page of one — and a short list reads as a quiet week rather than as a truncation, which is
   * the whole of item 13.
   *
   * <p><b>Both wire shapes are supported deliberately.</b> The deployed `/all` takes no `Pageable`,
   * so Spring drops these two parameters and returns the whole estate with neither header — and this
   * change has to work against that until the api ships. **Absent headers therefore mean "that was
   * all of it", not "page one of unknown"**, which is the reading in
   * `RoundBuilderComponent.nextPageOf`. Nothing here may assume a page exists after one it was not
   * told about, or it would ask the old endpoint for page 1 and be handed the whole estate again.
   *
   * <p>No `sort` is sent. The server defaults to **newest date first**, then shift, then id — an
   * administrator's working set is near today, and the id key is what makes the order total so a page
   * boundary inside a tie group can neither repeat nor skip a row. Naming an order from here would be
   * a second copy of a decision that belongs beside the query, and paging over an order the two ends
   * disagree about is the failure that decision exists to prevent.
   */
  listAll(page = 0, size = ITEMS_PER_PAGE): Observable<HttpResponse<DutyRosterAssignmentDto[]>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<DutyRosterAssignmentDto[]>(`${this.resourceUrl}/all`, { params, observe: 'response' });
  }

  assign(assignment: DutyRosterAssignmentDto): Observable<DutyRosterAssignmentDto> {
    return this.http.post<DutyRosterAssignmentDto>(this.resourceUrl, assignment).pipe(tap(() => this.loadMyAssignments()));
  }

  /**
   * Move a whole round to another professional, visits and all (DR4's endpoint, DR8's caller).
   *
   * <p>The default form of cover, and one auditable action: the customers, their times and their
   * order move together, because they are a coherent plan and splitting them by hand loses it. This
   * is what unblocks an absence approval the server has just refused with a 409.
   */
  reassignRound(id: string, professionalId: string): Observable<DutyRosterAssignmentDto> {
    return this.http.put<DutyRosterAssignmentDto>(`${this.resourceUrl}/${encodeURIComponent(id)}/reassign`, null, {
      params: new HttpParams().set('professionalId', professionalId),
    });
  }

  /**
   * Move a single visit to another professional — the fallback, for when one person cannot take the
   * whole round.
   *
   * <p>Returns the **target** round, since that is where the visit now is.
   */
  reassignVisit(id: string, visitId: string, professionalId: string): Observable<DutyRosterAssignmentDto> {
    return this.http.put<DutyRosterAssignmentDto>(
      `${this.resourceUrl}/${encodeURIComponent(id)}/visits/${encodeURIComponent(visitId)}/reassign`,
      null,
      { params: new HttpParams().set('professionalId', professionalId) },
    );
  }

  unassign(id: string): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${encodeURIComponent(id)}`).pipe(tap(() => this.loadMyAssignments()));
  }

  /** Exposed for the spec: active shift → "on duty until", else next upcoming → "next shift". */
  computeShiftLabel(assignments: readonly DutyRosterAssignmentDto[], now: Date): ShiftLabel | null {
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const hour = now.getHours();

    for (const assignment of assignments) {
      const window = SHIFT_WINDOWS[assignment.shift];
      if (!window) {
        continue;
      }
      const active =
        assignment.shift === 'NIGHT'
          ? (assignment.date === today && hour >= window.start) || (assignment.date === this.previousDay(today) && hour < window.end)
          : assignment.date === today && hour >= window.start && hour < window.end;
      if (active) {
        return { translationKey: 'healthConnect.roster.activeShift', translationParams: { time: `${pad(window.end)}:00` } };
      }
    }

    // a FLEXIBLE assignment covers its whole date in 2-4h blocks
    if (assignments.some(a => a.shift === 'FLEXIBLE' && a.date === today)) {
      return { translationKey: 'healthConnect.roster.flexibleShift', translationParams: { date: today } };
    }

    // OFF is excluded from the upcoming set, and this is the one place the exclusion has to be
    // written out. The loop above skips it for free — it has no window, so it can never be active —
    // but the search below leans on `shiftStartHour`, which answers 07:00 for any value with no
    // window. That default was written when FLEXIBLE was the only one, where it means "sorts with
    // the morning"; applied to OFF it announces a rostered rest day as "next shift, 07:00" in the
    // sidebar card, which reads as a working day nobody told the clinician about.
    const upcoming = assignments
      .filter(a => a.shift !== 'OFF')
      .filter(a => a.date > today || (a.date === today && hour < shiftStartHour(a.shift)))
      .sort((a, b) => (a.date === b.date ? shiftStartHour(a.shift) - shiftStartHour(b.shift) : a.date < b.date ? -1 : 1))[0];
    if (upcoming) {
      if (upcoming.shift === 'FLEXIBLE') {
        return { translationKey: 'healthConnect.roster.nextFlexibleShift', translationParams: { date: upcoming.date } };
      }
      return {
        translationKey: 'healthConnect.roster.nextShift',
        translationParams: { time: `${upcoming.date} ${pad(shiftStartHour(upcoming.shift))}:00` },
      };
    }
    return null;
  }

  private previousDay(isoDate: string): string {
    const d = new Date(`${isoDate}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}
