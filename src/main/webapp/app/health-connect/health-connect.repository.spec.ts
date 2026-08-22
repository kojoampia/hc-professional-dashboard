import { TestBed } from '@angular/core/testing';

import { FakeHealthConnectRepository } from './testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from './health-connect.repository';

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
    expect(repository.archiveCase('case-nii-closed')).toBe(true);
    expect(repository.listCases('closed')).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'case-nii-closed' })]));
    expect(repository.findCase('case-nii-closed')).toEqual(expect.objectContaining({ status: 'closed' }));
    expect(repository.archiveCase('case-nii-closed')).toBe(false);
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

  it('exposes resettable loading and error states', () => {
    repository.setLoading(true);
    expect(repository.asyncState()).toEqual({ status: 'loading', error: null });

    repository.setError('offline');
    expect(repository.asyncState()).toEqual({ status: 'error', error: 'offline' });

    repository.reset();
    expect(repository.asyncState()).toEqual({ status: 'ready', error: null });
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
