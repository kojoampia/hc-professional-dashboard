import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DashboardApiService } from './dashboard-api.service';

describe('DashboardApiService', () => {
  let service: DashboardApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DashboardApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches the summary from services/patientService/api/dashboard/summary', () => {
    service.summary().subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/patientService/api/dashboard/summary'));
    expect(req.request.method).toBe('GET');
    req.flush({ patients: 1, female: 1, male: 0, kids: 0, urgent: 0, open: 1, closed: 0 });
  });

  it('fetches the case timeline with a months query param', () => {
    service.caseTimeline(3).subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/patientService/api/dashboard/case-timeline'));
    expect(req.request.params.get('months')).toBe('3');
    req.flush([]);
  });

  it('fetches the case distribution', () => {
    service.caseDistribution().subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/patientService/api/dashboard/case-distribution'));
    req.flush([]);
  });

  it('fetches the case-by-patient-group series', () => {
    service.caseByPatientGroup().subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/patientService/api/dashboard/case-by-patient-group'));
    req.flush([]);
  });
});
