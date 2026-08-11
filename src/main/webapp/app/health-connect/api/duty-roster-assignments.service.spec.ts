import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { advanceTo, clear } from 'jest-date-mock';

import { DutyRosterAssignmentDto, DutyRosterAssignmentsService } from './duty-roster-assignments.service';

/**
 * WP6: the sidebar shift label is computed from real assignments returned by
 * `/api/duty-rosters/my` using the shift windows
 * MORNING 06–14, AFTERNOON 14–22, NIGHT 22–06.
 */
describe('DutyRosterAssignmentsService', () => {
  let service: DutyRosterAssignmentsService;
  let httpMock: HttpTestingController;

  const assignment = (partial: Partial<DutyRosterAssignmentDto>): DutyRosterAssignmentDto => ({
    id: 'a-1',
    date: '2026-07-30',
    duty: 'NURSE',
    professionalId: 'prof-1',
    shift: 'MORNING',
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

  it('targets the professionalService onboarding duty-roster surface', () => {
    // `shiftLabel` is a computed over the real clock, so pin "now" inside the
    // fixture's MORNING window — otherwise this passes only between 06:00 and
    // 14:00 on the fixture date and fails every day after it.
    advanceTo(new Date('2026-07-30T09:30:00'));

    service.loadMyAssignments();
    const request = httpMock.expectOne('services/professionalservice/api/duty-rosters/my');
    request.flush([assignment({})]);
    expect(service.myAssignments()).toHaveLength(1);
    expect(service.shiftLabel()).toEqual({ translationKey: 'healthConnect.roster.activeShift', translationParams: { time: '14:00' } });
  });

  describe('computeShiftLabel', () => {
    const at = (iso: string): Date => new Date(iso);

    it('reports the active shift with its end time', () => {
      const label = service.computeShiftLabel([assignment({ date: '2026-07-30', shift: 'MORNING' })], at('2026-07-30T09:30:00'));
      expect(label).toEqual({ translationKey: 'healthConnect.roster.activeShift', translationParams: { time: '14:00' } });
    });

    it('treats a night shift as active past midnight into the next day', () => {
      const label = service.computeShiftLabel([assignment({ date: '2026-07-30', shift: 'NIGHT' })], at('2026-07-31T03:00:00'));
      expect(label).toEqual({ translationKey: 'healthConnect.roster.activeShift', translationParams: { time: '06:00' } });
    });

    it('reports an active DAY shift within the 08:00-17:00 window', () => {
      const label = service.computeShiftLabel([assignment({ date: '2026-07-30', shift: 'DAY' })], at('2026-07-30T12:00:00'));
      expect(label).toEqual({ translationKey: 'healthConnect.roster.activeShift', translationParams: { time: '17:00' } });
      expect(service.computeShiftLabel([assignment({ date: '2026-07-30', shift: 'DAY' })], at('2026-07-30T18:00:00'))).toBeNull();
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
      expect(label).toEqual({ translationKey: 'healthConnect.roster.activeShift', translationParams: { time: '17:00' } });
    });

    it('announces an upcoming FLEXIBLE assignment by date without a fixed start time', () => {
      const label = service.computeShiftLabel([assignment({ date: '2026-08-02', shift: 'FLEXIBLE' })], at('2026-07-30T10:00:00'));
      expect(label).toEqual({ translationKey: 'healthConnect.roster.nextFlexibleShift', translationParams: { date: '2026-08-02' } });
    });

    it('falls back to the next upcoming shift start', () => {
      const label = service.computeShiftLabel(
        [assignment({ date: '2026-07-31', shift: 'AFTERNOON' }), assignment({ id: 'a-2', date: '2026-07-30', shift: 'NIGHT' })],
        at('2026-07-30T10:00:00'),
      );
      expect(label).toEqual({ translationKey: 'healthConnect.roster.nextShift', translationParams: { time: '2026-07-30 22:00' } });
    });

    it('returns null when there are no current or future assignments', () => {
      expect(service.computeShiftLabel([], at('2026-07-30T10:00:00'))).toBeNull();
      expect(service.computeShiftLabel([assignment({ date: '2026-07-01', shift: 'MORNING' })], at('2026-07-30T10:00:00'))).toBeNull();
    });
  });
});
