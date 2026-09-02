import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { advanceTo, clear } from 'jest-date-mock';

import { DutyRosterAssignmentDto, DutyRosterAssignmentsService } from './duty-roster-assignments.service';

/**
 * The sidebar shift label is computed from real assignments returned by the bare
 * `/api/duty-roster` — the caller's own roster since DR1, `/my` before it — using the four
 * contiguous windows DAY 07–15, EVENING 15–23, NIGHT 23–07 (wraps) and FLEXIBLE, the whole day.
 */
describe('DutyRosterAssignmentsService', () => {
  let service: DutyRosterAssignmentsService;
  let httpMock: HttpTestingController;

  const assignment = (partial: Partial<DutyRosterAssignmentDto>): DutyRosterAssignmentDto => ({
    id: 'a-1',
    date: '2026-07-30',
    duty: 'NURSE',
    professionalId: 'prof-1',
    shift: 'DAY',
    name: 'Ward 3',
    ...partial,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DutyRosterAssignmentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    clear();
    httpMock.verify();
  });

  it('reads the caller’s own roster from the bare professionalservice duty-roster URL', () => {
    // `shiftLabel` is a computed over the real clock, so pin "now" inside the fixture's DAY window —
    // otherwise this passes only between 07:00 and 15:00 on the fixture date and fails every day
    // after it.
    advanceTo(new Date('2026-07-30T09:30:00'));

    service.loadMyAssignments();
    // Exactly this URL: `/all` is the admin's estate view and 403s for a clinician, which is what
    // the dashboard used to hit.
    const request = httpMock.expectOne('services/professionalservice/api/duty-roster');
    request.flush([assignment({})]);
    expect(service.myAssignments()).toHaveLength(1);
    expect(service.shiftLabel()).toEqual({ translationKey: 'healthConnect.roster.activeShift', translationParams: { time: '15:00' } });
  });

  /**
   * The admin's estate read, bounded by `api/` `058ce46` (backlog.md items 7 and 13).
   *
   * <p>Two things are asserted and neither is decoration: that a page is **asked for**, since this
   * used to send nothing and take whatever came; and that the **response** is handed to the caller
   * rather than the body, since `X-Total-Count` and `Link` are the only way a caller can tell a
   * complete list from the first page of one.
   */
  describe('listAll', () => {
    it('asks for a bounded page and hands back the headers with it', () => {
      let response: { total: string | null; link: string | null } | undefined;
      service.listAll().subscribe(result => {
        response = { total: result.headers.get('X-Total-Count'), link: result.headers.get('Link') };
      });

      const request = httpMock.expectOne(req => req.url === 'services/professionalservice/api/duty-roster/all');
      expect(request.request.params.get('page')).toBe('0');
      expect(request.request.params.get('size')).toBe('20');
      // No `sort`: the server defaults to date then shift, and a second copy of that decision here is
      // how page 2 comes to repeat or skip a row from page 1.
      expect(request.request.params.has('sort')).toBe(false);

      request.flush([assignment({})], { headers: { 'X-Total-Count': '57', Link: '<…?page=1>; rel="next"' } });
      expect(response).toEqual({ total: '57', link: '<…?page=1>; rel="next"' });
    });

    it('asks for the page it was given', () => {
      service.listAll(3).subscribe();
      const request = httpMock.expectOne(req => req.url === 'services/professionalservice/api/duty-roster/all');
      expect(request.request.params.get('page')).toBe('3');
      request.flush([]);
    });
  });

  describe('computeShiftLabel', () => {
    const at = (iso: string): Date => new Date(iso);

    it('reports the active shift with its end time', () => {
      const label = service.computeShiftLabel([assignment({ date: '2026-07-30', shift: 'EVENING' })], at('2026-07-30T16:30:00'));
      expect(label).toEqual({ translationKey: 'healthConnect.roster.activeShift', translationParams: { time: '23:00' } });
    });

    it('treats a night shift as active past midnight into the next day', () => {
      const label = service.computeShiftLabel([assignment({ date: '2026-07-30', shift: 'NIGHT' })], at('2026-07-31T03:00:00'));
      expect(label).toEqual({ translationKey: 'healthConnect.roster.activeShift', translationParams: { time: '07:00' } });
    });

    it('starts a night shift at 23:00 on its own date, not at 22:00', () => {
      // The DR1 boundary move. Under the old 22:00 start this hour was already on duty; the shift
      // now begins an hour later, and 22:30 belongs to the EVENING that precedes it.
      expect(service.computeShiftLabel([assignment({ date: '2026-07-30', shift: 'NIGHT' })], at('2026-07-30T22:30:00'))).toEqual({
        translationKey: 'healthConnect.roster.nextShift',
        translationParams: { time: '2026-07-30 23:00' },
      });
      expect(service.computeShiftLabel([assignment({ date: '2026-07-30', shift: 'NIGHT' })], at('2026-07-30T23:30:00'))).toEqual({
        translationKey: 'healthConnect.roster.activeShift',
        translationParams: { time: '07:00' },
      });
    });

    it('reports an active DAY shift within the 07:00-15:00 window', () => {
      const label = service.computeShiftLabel([assignment({ date: '2026-07-30', shift: 'DAY' })], at('2026-07-30T12:00:00'));
      expect(label).toEqual({ translationKey: 'healthConnect.roster.activeShift', translationParams: { time: '15:00' } });
      expect(service.computeShiftLabel([assignment({ date: '2026-07-30', shift: 'DAY' })], at('2026-07-30T16:00:00'))).toBeNull();
    });

    it('covers the whole day across the four shifts, with no hour belonging to none of them', () => {
      // The property the enum was reshaped for: DAY 07-15, EVENING 15-23, NIGHT 23-07 tile the 24
      // hours exactly, with no overlap. The retired set could not — DAY 08-17 sat across both
      // MORNING 06-14 and AFTERNOON 14-22, so which shift owned 10:00 depended on iteration order.
      const roster = [
        assignment({ id: 'd', date: '2026-07-30', shift: 'DAY' }),
        assignment({ id: 'e', date: '2026-07-30', shift: 'EVENING' }),
        assignment({ id: 'n', date: '2026-07-30', shift: 'NIGHT' }),
        assignment({ id: 'n-prev', date: '2026-07-29', shift: 'NIGHT' }),
      ];
      for (let hour = 0; hour < 24; hour++) {
        const label = service.computeShiftLabel(roster, at(`2026-07-30T${String(hour).padStart(2, '0')}:00:00`));
        expect(label?.translationKey).toBe('healthConnect.roster.activeShift');
      }
    });

    it('labels a FLEXIBLE assignment on the current date as flexible duty regardless of the hour', () => {
      const flexible = [assignment({ date: '2026-07-30', shift: 'FLEXIBLE' })];
      expect(service.computeShiftLabel(flexible, at('2026-07-30T07:00:00'))).toEqual({
        translationKey: 'healthConnect.roster.flexibleShift',
        translationParams: { date: '2026-07-30' },
      });
      expect(service.computeShiftLabel(flexible, at('2026-07-30T21:00:00'))).toEqual({
        translationKey: 'healthConnect.roster.flexibleShift',
        translationParams: { date: '2026-07-30' },
      });
    });

    it('prefers an active fixed-window shift over a same-day flexible assignment', () => {
      const label = service.computeShiftLabel(
        [assignment({ date: '2026-07-30', shift: 'FLEXIBLE' }), assignment({ id: 'a-2', date: '2026-07-30', shift: 'DAY' })],
        at('2026-07-30T12:00:00'),
      );
      expect(label).toEqual({ translationKey: 'healthConnect.roster.activeShift', translationParams: { time: '15:00' } });
    });

    it('announces an upcoming FLEXIBLE assignment by date without a fixed start time', () => {
      const label = service.computeShiftLabel([assignment({ date: '2026-08-02', shift: 'FLEXIBLE' })], at('2026-07-30T10:00:00'));
      expect(label).toEqual({ translationKey: 'healthConnect.roster.nextFlexibleShift', translationParams: { date: '2026-08-02' } });
    });

    it('falls back to the next upcoming shift start', () => {
      const label = service.computeShiftLabel(
        [assignment({ date: '2026-07-31', shift: 'EVENING' }), assignment({ id: 'a-2', date: '2026-07-30', shift: 'NIGHT' })],
        at('2026-07-30T16:00:00'),
      );
      expect(label).toEqual({ translationKey: 'healthConnect.roster.nextShift', translationParams: { time: '2026-07-30 23:00' } });
    });

    it('returns null when there are no current or future assignments', () => {
      expect(service.computeShiftLabel([], at('2026-07-30T10:00:00'))).toBeNull();
      expect(service.computeShiftLabel([assignment({ date: '2026-07-01', shift: 'DAY' })], at('2026-07-30T10:00:00'))).toBeNull();
    });
  });
});
