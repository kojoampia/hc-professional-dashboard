import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { ShiftLabel } from '../health-connect.models';

export type DutyRosterShift = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'DAY' | 'FLEXIBLE';

export interface DutyRosterAssignmentDto {
  id?: string;
  date: string;
  duty: string;
  professionalId: string;
  shift: DutyRosterShift;
  name: string;
  description?: string | null;
}

/**
 * Local shift windows (hour of day, 24h): NIGHT wraps past midnight. FLEXIBLE
 * deliberately has no window — it stands for individually agreed 2–4 hour time
 * blocks on the assignment date and is labelled separately.
 */
const SHIFT_WINDOWS: Partial<Record<DutyRosterShift, { start: number; end: number }>> = {
  MORNING: { start: 6, end: 14 },
  AFTERNOON: { start: 14, end: 22 },
  NIGHT: { start: 22, end: 6 },
  DAY: { start: 8, end: 17 },
};

/** Sorting anchor for windowless (FLEXIBLE) shifts. */
const DEFAULT_START_HOUR = 8;

const startHour = (shift: DutyRosterShift): number => SHIFT_WINDOWS[shift]?.start ?? DEFAULT_START_HOUR;

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Real duty-roster assignments API (WP6) against the WP6
 * `/api/duty-rosters` surface — replaces the mock repository path
 * for the roster view and the sidebar shift label. Assignment-only policy:
 * professionals load their own assignments; administrators assign/unassign.
 */
@Injectable({ providedIn: 'root' })
export class DutyRosterAssignmentsService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/duty-rosters', 'professionalservice');

  private readonly myAssignmentsState = signal<readonly DutyRosterAssignmentDto[]>([]);
  readonly myAssignments = computed(() => this.myAssignmentsState());

  /** Sidebar user-card label (WP6 gate): driven by real assignments. */
  readonly shiftLabel = computed<ShiftLabel | null>(() => this.computeShiftLabel(this.myAssignmentsState(), new Date()));

  loadMyAssignments(): void {
    this.http.get<DutyRosterAssignmentDto[]>(`${this.resourceUrl}/my`).subscribe({
      next: assignments => this.myAssignmentsState.set(assignments),
      error: () => this.myAssignmentsState.set([]),
    });
  }

  listAll(): Observable<DutyRosterAssignmentDto[]> {
    return this.http.get<DutyRosterAssignmentDto[]>(this.resourceUrl);
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
      .filter(a => a.date > today || (a.date === today && hour < startHour(a.shift)))
      .sort((a, b) => (a.date === b.date ? startHour(a.shift) - startHour(b.shift) : a.date < b.date ? -1 : 1))[0];
    if (upcoming) {
      if (upcoming.shift === 'FLEXIBLE') {
        return { translationKey: 'healthConnect.roster.nextFlexibleShift', translationParams: { date: upcoming.date } };
      }
      return {
        translationKey: 'healthConnect.roster.nextShift',
        translationParams: { time: `${upcoming.date} ${pad(startHour(upcoming.shift))}:00` },
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
