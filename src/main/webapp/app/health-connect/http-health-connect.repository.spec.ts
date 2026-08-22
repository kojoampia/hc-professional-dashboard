import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { HttpHealthConnectRepository } from './http-health-connect.repository';

describe('HttpHealthConnectRepository', () => {
  let repository: HttpHealthConnectRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), HttpHealthConnectRepository] });
    repository = TestBed.inject(HttpHealthConnectRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const flushInitialLoad = () => {
    httpMock
      .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
      .flush(
        [{ id: 'patient-kojo', patientName: 'Kojo Ampia-Addison', lastActivityAt: '2026-07-20T05:00:00Z', sex: 'male', isChild: false }],
        { headers: { 'X-Total-Count': '1' } },
      );
    httpMock
      .expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases'))
      .flush(
        [
          {
            id: 'case-1',
            symptoms: 'Fever',
            diagnoses: '',
            recommendations: '',
            patientId: 'patient-kojo',
            status: 'urgent',
            brief: 'High fever',
            createdDate: '2026-07-20T05:00:00Z',
          },
        ],
        { headers: {} },
      );
    // Singular, and NOT /all: the dashboard reads the caller's own roster. Reaching for the
    // admin-only estate collection is what returned 403 to every clinician before DR1, so this is
    // matched exactly — the whole point of the fix is which of the two URLs gets called.
    httpMock.expectOne('services/professionalservice/api/duty-roster').flush([]);
  };

  it('loads the patient list and case queue on construction', () => {
    flushInitialLoad();

    expect(repository.patientRows()).toHaveLength(1);
    expect(repository.patientRows()[0].patientName).toBe('Kojo Ampia-Addison');

    expect(repository.caseQueue()).toHaveLength(1);
    expect(repository.caseQueue()[0]).toMatchObject({ id: 'case-1', status: 'urgent', brief: 'High fever', patientId: 'patient-kojo' });
    expect(repository.caseCounts()).toEqual({ urgent: 1, open: 0, treatment: 0, closed: 0 });
  });

  it('reads the caller’s own roster and scopes "my roster" to assignments held by that professional', () => {
    httpMock
      .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
      .flush([], { headers: { 'X-Total-Count': '0' } });
    httpMock
      .expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases'))
      .flush(
        [
          { id: 'case-mine', patientId: 'p-1', status: 'open', brief: 'Mine', assignedRosterId: 'r-mine' },
          { id: 'case-theirs', patientId: 'p-2', status: 'open', brief: 'Theirs', assignedRosterId: 'r-theirs' },
        ],
        { headers: {} },
      );
    httpMock
      .expectOne('services/professionalservice/api/duty-roster')
      .flush([{ id: 'r-mine', date: '2026-08-20', duty: 'NURSE', professionalId: 'prof-1', shift: 'NIGHT', name: 'Ward 3' }]);

    expect(repository.dutyRosters()).toEqual([expect.objectContaining({ id: 'r-mine', shift: 'NIGHT', professionalId: 'prof-1' })]);
    expect(repository.listCases(undefined, 'mine', 'prof-1').map(row => row.id)).toEqual(['case-mine']);
    expect(
      repository
        .listCases(undefined, 'all')
        .map(row => row.id)
        .sort(),
    ).toEqual(['case-mine', 'case-theirs']);
    // Without an id we do not know who "me" is, so "mine" selects nothing rather than everything.
    expect(repository.listCases(undefined, 'mine')).toEqual([]);
  });

  it('lazily fetches a patient record on findPatient and populates it once the response lands', () => {
    flushInitialLoad();

    expect(repository.findPatient('patient-kojo')).toBeUndefined();

    const req = httpMock.expectOne(request => request.url.endsWith('services/professionalservice/api/patients/patient-kojo'));
    req.flush({
      id: 'patient-kojo',
      patientName: 'Kojo Ampia-Addison',
      lastActivityAt: '2026-07-20T05:00:00Z',
      sex: 'male',
      isChild: false,
      dateOfBirth: '1976-04-19',
      phone: '0242286304',
      email: 'kojo@jac.net',
      cases: [],
      visitations: [],
      activities: [],
      medications: [],
      reports: [],
    });

    expect(repository.findPatient('patient-kojo')?.patient.patientName).toBe('Kojo Ampia-Addison');
  });

  it('optimistically applies updateCase and PATCHes the clinical-case fields', () => {
    flushInitialLoad();

    const updated = repository.updateCase('case-1', { status: 'closed', diagnosis: 'Resolved' });

    expect(updated).toMatchObject({ id: 'case-1', status: 'closed', diagnosis: 'Resolved' });
    expect(repository.caseCounts()).toEqual({ urgent: 0, open: 0, treatment: 0, closed: 1 });

    const req = httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases/case-1'));
    expect(req.request.method).toBe('PATCH');
    // status goes to the wire in the generated enum's upper case; diagnosis is a real field now.
    expect(req.request.body).toMatchObject({ status: 'CLOSED', diagnosis: 'Resolved' });
    req.flush({ id: 'case-1', status: 'CLOSED', diagnosis: 'Resolved' });
  });
});
