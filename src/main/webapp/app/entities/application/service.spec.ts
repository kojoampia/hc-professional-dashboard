import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';
import { ApplicationService } from './service';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let httpMock: HttpTestingController;
  let base: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApplicationService);
    httpMock = TestBed.inject(HttpTestingController);
    base = TestBed.inject(ApplicationConfigService).getEndpointFor('api/professional-application', 'professionalservice');
  });

  afterEach(() => httpMock.verify());

  /**
   * 404 is the normal state for every clinician seeded or invited rather than hired through the
   * careers page, so the read opts out of the global error banner — the untreated version put a red
   * "Not found" over every page in the portal.
   */
  it('reads the own application outside the global error banner', () => {
    service.find().subscribe({ error: () => undefined });
    const req = httpMock.expectOne(`${base}/me`);
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SKIP_ERROR_ALERT)).toBe(true);
    req.flush(null, { status: 404, statusText: 'Not Found' });
  });

  /**
   * The body is step 4's model — `agreed` and `authority`, the field names `profile.md` gives. Both
   * halves are asserted because the server binds an allow-list record: a stale field name is not
   * refused, it is simply not heard, so a rename left behind would store `authority: null` and
   * answer 201 doing it.
   */
  it('starts an application with consent', () => {
    service.start('ROLE_NURSE').subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ agreed: true, authority: 'ROLE_NURSE', source: null });
    req.flush({ id: 'app-1', accountId: 'me', status: 'APPLICATION_STARTED' });
  });

  it('carries the careers attribution source when present', () => {
    service.start('ROLE_DOCTOR', 'web-careers').subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.body).toEqual({ agreed: true, authority: 'ROLE_DOCTOR', source: 'web-careers' });
    req.flush({ id: 'app-1', accountId: 'me', status: 'APPLICATION_STARTED' });
  });

  it('saves the consent and authority through the step 4 write', () => {
    service.saveConsent('ROLE_PARAMEDIC').subscribe();
    const req = httpMock.expectOne(`${base}/me`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ agreed: true, authority: 'ROLE_PARAMEDIC' });
    req.flush({ id: 'app-1', accountId: 'me', status: 'CREDENTIAL_REVIEW' });
  });

  it('advances to PROFILE_COMPLETED through the state machine', () => {
    service.completeProfile().subscribe();
    const req = httpMock.expectOne(`${base}/me/complete-profile`);
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 'app-1', accountId: 'me', status: 'PROFILE_COMPLETED' });
  });

  it('submits with the consent body on /me/submit', () => {
    service.submit('ROLE_NURSE').subscribe();
    const req = httpMock.expectOne(`${base}/me/submit`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ agreed: true, authority: 'ROLE_NURSE' });
    req.flush({ id: 'app-1', accountId: 'me', status: 'CREDENTIAL_REVIEW' });
  });
});
