import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { DutyRosterShift, SHIFT_WINDOWS, ShiftLabel, shiftStartHour } from '../health-connect.models';

/**
 * Re-exported so callers of this adapter get the shift union from the adapter they already import.
 * It is *defined* in `health-connect.models`, not here — the mirror of
 * `api/domain/enumeration/ShiftType` is a cross-repo invariant and one copy of it in this repo is
 * hard enough to keep in step with the enum and the four i18n catalogues without a second.
 */
export type { DutyRosterShift };

export interface DutyRosterAssignmentDto {
  id?: string;
  date: string;
  duty: string;
  professionalId: string;
  shift: DutyRosterShift;
  name: string;
  description?: string | null;
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

  listAll(): Observable<DutyRosterAssignmentDto[]> {
    return this.http.get<DutyRosterAssignmentDto[]>(`${this.resourceUrl}/all`);
  }

  assign(assignment: DutyRosterAssignmentDto): Observable<DutyRosterAssignmentDto> {
    return this.http.post<DutyRosterAssignmentDto>(this.resourceUrl, assignment).pipe(tap(() => this.loadMyAssignments()));
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

    const upcoming = assignments
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
