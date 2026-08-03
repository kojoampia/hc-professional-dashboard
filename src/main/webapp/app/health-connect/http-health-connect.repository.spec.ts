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
      .expectOne(request => request.url.endsWith('services/patientservice/api/patients'))
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
    httpMock.expectOne(request => request.url.endsWith('services/professionalservice/api/duty-rosters')).flush([]);
    httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/dashboard/case-timeline')).flush([]);
    httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/dashboard/case-distribution')).flush([]);
    httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/dashboard/case-by-patient-group')).flush([]);
  };

  it('loads the patient list and case queue on construction', () => {
    flushInitialLoad();

    expect(repository.patientRows()).toHaveLength(1);
    expect(repository.patientRows()[0].patientName).toBe('Kojo Ampia-Addison');

    expect(repository.caseQueue()).toHaveLength(1);
    expect(repository.caseQueue()[0]).toMatchObject({ id: 'case-1', status: 'urgent', brief: 'High fever', patientId: 'patient-kojo' });
    expect(repository.caseCounts()).toEqual({ urgent: 1, open: 0, closed: 0 });
  });

  it('lazily fetches a patient record on findPatient and populates it once the response lands', () => {
    flushInitialLoad();

    expect(repository.findPatient('patient-kojo')).toBeUndefined();

    const req = httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/patients/patient-kojo'));
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
    expect(repository.caseCounts()).toEqual({ urgent: 0, open: 0, closed: 1 });

    const req = httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases/case-1'));
    expect(req.request.method).toBe('PATCH');
    // status goes to the wire in the generated enum's upper case; diagnosis is a real field now.
    expect(req.request.body).toMatchObject({ status: 'CLOSED', diagnosis: 'Resolved' });
    req.flush({ id: 'case-1', status: 'CLOSED', diagnosis: 'Resolved' });
  });
});
