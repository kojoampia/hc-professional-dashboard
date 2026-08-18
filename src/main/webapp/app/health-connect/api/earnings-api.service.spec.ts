import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { EarningsApiService } from './earnings-api.service';

describe('EarningsApiService', () => {
  let service: EarningsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EarningsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads earnings from adminservice, which owns shifts and wage rates', () => {
    service.ownEarnings().subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/adminservice/api/professionals/me/earnings'));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('reads the roster from the same self-scoped surface', () => {
    service.ownShifts().subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('services/adminservice/api/professionals/me/shifts'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  /**
   * The security property, asserted at the client too. hc-admin refuses a client-supplied id, but a
   * URL built here with one would fail as a 403 somebody would then be tempted to "fix" by widening
   * the server rule. Keeping `me` literal in the path is what makes that conversation unnecessary.
   */
  it('never puts a professional id in the URL', () => {
    service.ownEarnings().subscribe();
    service.ownShifts().subscribe();
    const requests = httpMock.match(() => true);
    expect(requests).toHaveLength(2);
    for (const req of requests) {
      expect(req.request.url).toContain('/api/professionals/me/');
      expect(req.request.urlWithParams).not.toMatch(/professionalId|[?&]id=/);
      req.flush(req.request.url.endsWith('/shifts') ? [] : {});
    }
  });

  it('sends the window and granularity when they are given', () => {
    service.ownEarnings({ granularity: 'WEEKLY', from: '2026-08-01', to: '2026-08-31' }).subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('/earnings'));
    expect(req.request.params.get('granularity')).toBe('WEEKLY');
    expect(req.request.params.get('from')).toBe('2026-08-01');
    expect(req.request.params.get('to')).toBe('2026-08-31');
    req.flush({});
  });

  /**
   * An omitted parameter must not become an empty one. `from=` is a parse failure server-side, not
   * "use the default", so a blank value silently returns a different window than the screen asked
   * for — and the response still looks perfectly well-formed.
   */
  it('omits parameters that were not set rather than sending them blank', () => {
    service.ownEarnings({ granularity: 'MONTHLY' }).subscribe();
    const req = httpMock.expectOne(request => request.url.endsWith('/earnings'));
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);
    expect(req.request.params.get('granularity')).toBe('MONTHLY');
    req.flush({});
  });

  /** Read-only: there is no way to reach a wage rate from this client, by any method. */
  it('exposes only the two self-scoped reads', () => {
    expect(
      Object.getOwnPropertyNames(Object.getPrototypeOf(service))
        .filter(name => name !== 'constructor')
        .sort(),
    ).toEqual(['ownEarnings', 'ownShifts']);
  });
});
