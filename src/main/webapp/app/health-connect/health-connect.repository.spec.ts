import { Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ASYNC_STATUSES, AsyncViewState } from './health-connect.models';
import { FakeHealthConnectRepository } from './testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY, HealthConnectRepository, RepositoryRead } from './health-connect.repository';
import { HttpHealthConnectRepository } from './http-health-connect.repository';

describe('FakeHealthConnectRepository', () => {
  let repository: FakeHealthConnectRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository }],
    });
    repository = TestBed.inject(FakeHealthConnectRepository);
    repository.reset();
  });

  it('derives case counts and chart distribution from deterministic patient records', () => {
    expect(repository.caseCounts()).toEqual({ urgent: 2, open: 2, treatment: 0, closed: 3 });
    expect(repository.charts().caseDistribution).toEqual([
      { label: 'urgent', value: 2 },
      { label: 'open', value: 2 },
      { label: 'closed', value: 3 },
    ]);
  });

  it('filters and paginates patient rows without mutating its fixture state', () => {
    const result = repository.filterPatients('kojo', { page: 9, pageSize: 1 });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'patient-kojo',
          patientName: 'Kojo Ampia-Addison',
        }),
      ],
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
    });
    expect(repository.findPatient('patient-kojo')?.patient.patientName).toBe('Kojo Ampia-Addison');
    expect(repository.findPatient('unknown-patient')).toBeUndefined();
  });

  it('filters patient rows by URL-backed gender and child demographics', () => {
    expect(repository.filterPatients('', { page: 1, pageSize: 10 }, { gender: 'female' }).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'patient-ama', sex: 'female' })]),
    );
    expect(repository.filterPatients('', { page: 1, pageSize: 10 }, { childrenOnly: true }).items).toEqual([
      expect.objectContaining({ id: 'patient-yaw', isChild: true }),
      expect.objectContaining({ id: 'patient-akosua', isChild: true }),
    ]);
  });

  it('looks up and filters cases by status and subscribed roster', () => {
    expect(repository.findCase('case-kojo-urgent')?.brief).toBe('Severe pain due to a fall.');
    expect(repository.listCases('urgent')).toHaveLength(2);
    expect(repository.listCases(undefined, 'mine', 'professional-doctor')).toHaveLength(7);
    expect(repository.listCases(undefined, 'mine', 'unknown-professional')).toEqual([]);
  });

  it('updates a case only in local state and resets it to its fixture value', () => {
    expect(repository.updateCase('case-kojo-urgent', { diagnosis: 'Observation', recommendationIds: ['x-ray'] })).toEqual(
      expect.objectContaining({ diagnosis: 'Observation', recommendationIds: ['x-ray'] }),
    );
    expect(repository.findCase('case-kojo-urgent')).toEqual(expect.objectContaining({ diagnosis: 'Observation' }));

    repository.reset();

    expect(repository.findCase('case-kojo-urgent')).toEqual(expect.objectContaining({ diagnosis: '', recommendationIds: [] }));
  });

  it('archives local queue rows without deleting the case detail record', () => {
    expect(repository.archiveCase('case-nii-closed', 'Resolved at follow-up')).toBe(true);
    expect(repository.listCases('closed')).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'case-nii-closed' })]));
    expect(repository.findCase('case-nii-closed')).toEqual(expect.objectContaining({ status: 'closed' }));
    expect(repository.archiveCase('case-nii-closed', 'Resolved at follow-up')).toBe(false);
  });

  it('appends a timestamped activity only to the requested patient', () => {
    const activity = repository.appendActivity('patient-kojo', {
      title: 'Review completed',
      description: 'Clinical review completed locally.',
      createdAt: '2026-07-20T15:00:00Z',
    });

    expect(activity).toEqual({
      id: 'activity-2',
      occurredAt: '2026-07-20T15:00:00Z',
      label: 'Review completed',
      title: 'Review completed',
      description: 'Clinical review completed locally.',
      createdAt: '2026-07-20T15:00:00Z',
    });
    expect(repository.findPatient('patient-kojo')?.activities).toHaveLength(2);
    expect(repository.findPatient('patient-kwabena')?.activities).toEqual([]);
    expect(repository.appendActivity('unknown-patient', activity!)).toBeNull();
  });

  it('adds a clinical report only to local patient state', () => {
    expect(
      repository.appendReport('patient-kojo', {
        reportType: 'lab',
        label: 'Follow-up laboratory report',
        occurredAt: '2026-07-20T15:00:00Z',
        url: 'mock://report/follow-up',
      }),
    ).toEqual(
      expect.objectContaining({
        id: 'report-2',
        label: 'Follow-up laboratory report',
        url: 'mock://report/follow-up',
      }),
    );
    expect(repository.findPatient('patient-kojo')?.reports).toHaveLength(2);
    expect(repository.findPatient('patient-kwabena')?.reports).toEqual([]);
  });

  it('exposes resettable per-read states, and one read’s state is not the other’s', () => {
    // Per read since item 146. The second block is the property: putting the case queue into a
    // state says nothing about the directory — which is exactly what one shared signal could not
    // express, and what three page templates were bound to.
    repository.setReadState('directory', { status: 'loading', error: null });
    expect(repository.directoryState()).toEqual({ status: 'loading', error: null });
    expect(repository.caseQueueState()).toEqual({ status: 'ready', error: null });

    repository.setReadState('caseQueue', { status: 'forbidden', error: 'healthConnect.states.forbidden' });
    expect(repository.caseQueueState()).toEqual({ status: 'forbidden', error: 'healthConnect.states.forbidden' });
    expect(repository.directoryState()).toEqual({ status: 'loading', error: null });

    repository.reset();
    expect(repository.directoryState()).toEqual({ status: 'ready', error: null });
    expect(repository.caseQueueState()).toEqual({ status: 'ready', error: null });
  });

  /**
   * Item 168's constraint, held by a check rather than by somebody having looked.
   *
   * <p>Moving `setReadState` off the production interface is only safe while the specs that reach a
   * refused read, an outage and an unanswered read can still reach every state those cases live in —
   * the property items 146 and 165 bought with their guards. So: every `AsyncStatus`, on every read.
   *
   * <p><b>Both axes are derived, and that is the point.</b> The statuses come from `ASYNC_STATUSES`,
   * the runtime array item 146 introduced precisely so a bare union could not hide an unexercised
   * member; a sixth arrives here with no edit. The reads come from a `Record<RepositoryRead, …>`,
   * which the compiler will not let be built with a member missing, so a third read fails to compile
   * rather than going unchecked. A hand-written list of either would be worse than nothing — it would
   * report on the set somebody remembered.
   *
   * <p>Each status is approached from a *different* one first, chosen from the array rather than
   * named, because `'ready'` is the fake's resting state: a `setReadState` that silently did nothing
   * would still satisfy an assertion that the read is `'ready'`.
   */
  describe('every AsyncStatus stays reachable from a spec (item 168)', () => {
    const readStates = (): Readonly<Record<RepositoryRead, Signal<AsyncViewState>>> => ({
      directory: repository.directoryState,
      caseQueue: repository.caseQueueState,
    });

    it.each(ASYNC_STATUSES.map(status => [status] as const))('reaches %s on every read', status => {
      // `error` is null throughout: what is under test is which statuses the seam can express, not
      // which key each carries. The catalogue keys are asserted by the page specs that render them.
      const target: AsyncViewState = { status, error: null };
      const approachFrom = ASYNC_STATUSES.find(candidate => candidate !== status)!;

      for (const [read, state] of Object.entries(readStates()) as [RepositoryRead, Signal<AsyncViewState>][]) {
        repository.setReadState(read, { status: approachFrom, error: null });
        expect(state().status).toBe(approachFrom);

        repository.setReadState(read, target);
        expect(state()).toEqual(target);
      }
    });
  });

  /**
   * The other half of item 168: the seam is the fake's, and it is on nothing the application holds.
   *
   * <p>`setReadState` was declared on {@link HealthConnectRepository} and implemented on
   * {@link HttpHealthConnectRepository} with no production caller. A mutator there is reachable from
   * production code, and a read state that no read produced is a signal asserting something the
   * network never said — the shape items 146 and 165 exist to remove, one layer down. Nothing today
   * calls it; this asserts that nothing *can*.
   */
  it('keeps the read-state seam off the production surface', () => {
    // @ts-expect-error — `setReadState` must not be a member of `HealthConnectRepository`, and this
    // line is the guard rather than a workaround: it is a type error today, and `@ts-expect-error`
    // itself becomes an error on the day it stops being one — the day somebody puts the seam back on
    // the interface. Re-declaring it there alone would also break `implements` on the two classes; it
    // is re-declaring it there *and* implementing it, which compiles cleanly everywhere else, that
    // nothing but this line would notice.
    const seamOnTheInterface: keyof HealthConnectRepository = 'setReadState';
    expect(seamOnTheInterface).toBe('setReadState');

    // And the implementation the application is actually bound to. Its own prototype rather than
    // `in`, so a method inherited from somewhere else is not mistaken for this one coming back.
    expect(Object.getOwnPropertyNames(HttpHealthConnectRepository.prototype)).not.toContain('setReadState');
  });

  /**
   * This replaced a test of `subscribeProfessionalToRoster` / `unsubscribeProfessionalFromRoster`,
   * removed in DR1 along with the endpoints they called — which were never built on either side.
   * The roster is assignment-only, so what is left to assert is that the label follows the
   * assignment and that an account holding none gets nothing rather than someone else's.
   */
  it('derives the optional shift label from the account’s own assignments', () => {
    expect(repository.shiftLabelForAccount('doctor')).toEqual({
      translationKey: 'healthConnect.roster.nextShift',
      translationParams: { time: '2026-07-20 23:00' },
    });
    expect(repository.shiftLabelForAccount('nobody')).toBeNull();
  });

  it('scopes "my roster" to cases on the caller’s own assignments', () => {
    expect(repository.listCases(undefined, 'mine', 'professional-doctor').length).toBeGreaterThan(0);
    // clinic-a-day belongs to another professional, so none of its cases are the doctor's.
    expect(repository.listCases(undefined, 'mine', 'professional-nurse')).toEqual([]);
  });
});
