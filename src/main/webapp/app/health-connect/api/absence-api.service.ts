import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApplicationConfigService } from 'app/core/config/application-config.service';

/** Mirrors `api/domain/enumeration/AbsenceType`. Three values, and the shortness is the point. */
export type AbsenceType = 'HOLIDAY' | 'SICK' | 'OTHER';

/**
 * Mirrors `api/domain/enumeration/AbsenceStatus`. Two values: there is no `REJECTED`, because
 * declining is deletion and so is a professional withdrawing their own request.
 */
export type AbsenceStatus = 'REQUESTED' | 'APPROVED';

export interface AbsenceDto {
  id?: string;
  professionalId?: string;
  /** ISO date, inclusive. */
  fromDate: string;
  /** ISO date, inclusive — equal to `fromDate` for a single day off. */
  toDate: string;
  type: AbsenceType;
  status: AbsenceStatus;
}

/**
 * Absences, against `/api/absences` (DR4). **Read-only in DR5** — the calendar colours days from
 * these; requesting, withdrawing and approving are DR8's.
 *
 * <p>The range read matches **overlap**, not "starts within": a holiday that began last month and
 * runs into the week being drawn is exactly the case a calendar must not miss, and the backend query
 * is written that way. Both bounds are optional there, but this adapter always sends both, because
 * every caller here is drawing a bounded grid.
 *
 * <p><b>Failure is silent and empty.</b> A calendar that cannot reach the absence endpoint still has
 * to draw the rounds — the same way the dashboard's earnings card treats an unreachable
 * `adminservice`. The cost is that an outage renders as "no absences" rather than as an error, which
 * is the right trade for a read that decorates rather than informs: a clinician who cannot see their
 * granted holiday is inconvenienced, one who cannot see their shifts cannot work.
 */
@Injectable({ providedIn: 'root' })
export class AbsenceApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/absences', 'professionalservice');

  /**
   * The caller's own absences overlapping `[from, to]`, both inclusive.
   *
   * <p>`professionalId` is deliberately not exposed. The parameter exists on the endpoint for DR8's
   * approval queue, and a read that can be pointed at a colleague has no business in the component
   * that draws *my* calendar — the 403 it would earn is a server-side backstop, not a design.
   */
  mine(from: string, to: string): Observable<AbsenceDto[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<AbsenceDto[]>(this.resourceUrl, { params }).pipe(catchError(() => of<AbsenceDto[]>([])));
  }

  /**
   * The caller's own absences, unbounded — the "my time off" list (DR8).
   *
   * <p>Unlike {@link mine} this does **not** swallow its errors. That method decorates a calendar
   * which must draw shifts either way; this one *is* the screen, and a list that silently shows
   * nothing would tell a clinician their approved leave had vanished.
   */
  own(): Observable<AbsenceDto[]> {
    return this.http.get<AbsenceDto[]>(this.resourceUrl);
  }

  /**
   * Every absence on the estate — the approval queue's read. Admin only; a clinician gets a 403.
   */
  all(): Observable<AbsenceDto[]> {
    return this.http.get<AbsenceDto[]>(`${this.resourceUrl}/all`);
  }

  /**
   * One professional's absences overlapping a range — what the assign form's warning reads (DR8).
   *
   * <p>Admin only in practice: the server refuses an id that is not the caller's own with a 403. The
   * warning treats a failure as "no known leave" rather than blocking the form, because this is
   * advice and the administrator is allowed to proceed regardless.
   */
  forProfessional(professionalId: string, from: string, to: string): Observable<AbsenceDto[]> {
    const params = new HttpParams().set('professionalId', professionalId).set('from', from).set('to', to);
    return this.http.get<AbsenceDto[]>(this.resourceUrl, { params }).pipe(catchError(() => of<AbsenceDto[]>([])));
  }

  /**
   * Ask for time off.
   *
   * <p>**The first write a professional has against their own roster** — a deliberate, scoped
   * exception to the assignment-only policy. The server ignores any `professionalId` or `status` in
   * the body for a non-administrator and forces both, so this sends neither: a client that appears to
   * choose whose absence it is, or that it is already approved, invites the next reader to believe it
   * can.
   */
  request(absence: Pick<AbsenceDto, 'fromDate' | 'toDate' | 'type'>): Observable<AbsenceDto> {
    return this.http.post<AbsenceDto>(this.resourceUrl, absence);
  }

  /**
   * Grant a request. Admin only, and **409 while the days are still rostered**.
   *
   * <p>Errors are not swallowed, and the 409 in particular must reach the caller intact: its body
   * names the rounds in the way, which is the whole point of refusing rather than warning. See
   * {@link AbsenceConflict}.
   */
  approve(id: string): Observable<AbsenceDto> {
    return this.http.put<AbsenceDto>(`${this.resourceUrl}/${encodeURIComponent(id)}/approve`, null);
  }

  /** An administrator declining, or a professional withdrawing their own pending request. */
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${encodeURIComponent(id)}`);
  }
}

/** The 409 body from {@link AbsenceApiService.approve} — a message and the rounds that clash. */
export interface AbsenceConflict {
  message: string;
  conflictingRosterIds: string[];
}
