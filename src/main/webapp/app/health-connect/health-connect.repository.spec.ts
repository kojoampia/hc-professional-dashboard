import { TestBed } from '@angular/core/testing';

import { MockHealthConnectRepository } from './health-connect.repository';

describe('MockHealthConnectRepository', () => {
  let repository: MockHealthConnectRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    repository = TestBed.inject(MockHealthConnectRepository);
    repository.reset();
  });

  it('derives case counts and chart distribution from deterministic patient records', () => {
    expect(repository.caseCounts()).toEqual({ urgent: 2, open: 2, closed: 3 });
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

  it('updates roster subscriptions and derives the optional shift label', () => {
    expect(repository.shiftLabelForAccount('doctor')).toEqual({
      translationKey: 'healthConnect.roster.activeShift',
      translationParams: { time: '20:00' },
    });
    expect(repository.unsubscribeProfessionalFromRoster('professional-doctor', 'ward-3-night')).toBe(true);
    expect(repository.shiftLabelForAccount('doctor')).toBeNull();
    expect(repository.subscribeProfessionalToRoster('professional-doctor', 'ward-3-night')).toBe(true);
    expect(repository.subscribeProfessionalToRoster('professional-doctor', 'ward-3-night')).toBe(false);
  });
});
