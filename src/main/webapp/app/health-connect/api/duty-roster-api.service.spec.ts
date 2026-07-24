import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DutyRosterApiService } from './duty-roster-api.service';

describe('DutyRosterApiService', () => {
  let service: DutyRosterApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DutyRosterApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists duty rosters from the professionalService microservice', () => {
    service.list().subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/professionalService/api/duty-rosters'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('subscribes to a roster', () => {
    service.subscribe('ward-3-night').subscribe();
    const req = httpMock.expectOne(request =>
      request.url.endsWith('services/professionalService/api/duty-rosters/ward-3-night/subscription'),
    );
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('unsubscribes from a roster', () => {
    service.unsubscribe('ward-3-night').subscribe();
    const req = httpMock.expectOne(request =>
      request.url.endsWith('services/professionalService/api/duty-rosters/ward-3-night/subscription'),
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
