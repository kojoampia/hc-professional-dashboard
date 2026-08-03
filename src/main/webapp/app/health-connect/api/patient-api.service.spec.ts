import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PatientApiService } from './patient-api.service';

describe('PatientApiService', () => {
  let service: PatientApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PatientApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('queries the patient list with paging params', () => {
    service.query({ query: 'kojo', page: 0, size: 20 }).subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/patients'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('query')).toBe('kojo');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush([], { headers: { 'X-Total-Count': '0' } });
  });

  it('fetches a single patient record', () => {
    service.find('patient-kojo').subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/patients/patient-kojo'));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('posts a new activity log entry', () => {
    service.appendActivity('patient-kojo', { title: 'Vitals recorded', description: 'BP 120/80' }).subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/patients/patient-kojo/activities'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Vitals recorded', description: 'BP 120/80' });
    req.flush({});
  });

  it('posts a new report', () => {
    service.appendReport('patient-kojo', { reportType: 'lab' }).subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/patients/patient-kojo/reports'));
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
