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

  it('fetches the summary from professionalservice, which owns the patient relation', () => {
    service.summary().subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/professionalservice/api/dashboard/summary'));
    expect(req.request.method).toBe('GET');
    req.flush({ patients: 1, female: 1, male: 0, kids: 0, urgent: 0, open: 1, closed: 0 });
  });

  it('exposes only the summary — the case charts are computed, not fetched', () => {
    // caseTimeline, caseDistribution and caseByPatientGroup used to be three more requests against
    // endpoints that never existed. They are derived from the case collection the repository
    // already holds, so re-adding them here would mean re-adding three round trips that buy
    // nothing and fail independently. Asserted so that does not quietly come back.
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(service)).filter(name => name !== 'constructor')).toEqual(['summary']);
  });
});
