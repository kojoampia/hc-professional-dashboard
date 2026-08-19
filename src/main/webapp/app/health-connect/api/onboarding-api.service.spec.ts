import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';
import { OnboardingApiService } from './onboarding-api.service';

describe('OnboardingApiService', () => {
  let service: OnboardingApiService;
  let httpMock: HttpTestingController;
  let base: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OnboardingApiService);
    httpMock = TestBed.inject(HttpTestingController);
    base = TestBed.inject(ApplicationConfigService).getEndpointFor('api/onboarding', 'professionalservice');
  });

  afterEach(() => httpMock.verify());

  it('starts an application with consent against the WP3 endpoint', () => {
    service.startApplication('ROLE_NURSE').subscribe();
    const req = httpMock.expectOne(`${base}/applications`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ requestedRole: 'ROLE_NURSE', consentAccepted: true, source: null });
    req.flush({ id: 'app-1', accountId: 'me', status: 'APPLICATION_STARTED' });
  });

  it('carries the careers attribution source when present', () => {
    service.startApplication('ROLE_DOCTOR', 'web-careers').subscribe();
    const req = httpMock.expectOne(`${base}/applications`);
    expect(req.request.body).toEqual({ requestedRole: 'ROLE_DOCTOR', consentAccepted: true, source: 'web-careers' });
    req.flush({ id: 'app-1', accountId: 'me', status: 'APPLICATION_STARTED' });
  });

  it('drives the lifecycle endpoints', () => {
    service.getOwnApplication().subscribe();
    httpMock.expectOne(`${base}/applications/me`).flush({ id: 'app-1', accountId: 'me', status: 'APPLICATION_STARTED' });

    service.completeProfile().subscribe();
    const complete = httpMock.expectOne(`${base}/applications/me/complete-profile`);
    expect(complete.request.method).toBe('PUT');
    complete.flush({ id: 'app-1', accountId: 'me', status: 'PROFILE_COMPLETED' });

    service.submit().subscribe();
    const submit = httpMock.expectOne(`${base}/applications/me/submit`);
    expect(submit.request.method).toBe('PUT');
    submit.flush({ id: 'app-1', accountId: 'me', status: 'CREDENTIAL_REVIEW' });

    service.events('app-1').subscribe();
    httpMock.expectOne(`${base}/applications/app-1/events`).flush([]);
  });

  it('round-trips the profile through the onboarding surface', () => {
    service.getOwnProfile().subscribe();
    httpMock.expectOne(`${base}/profile`).flush({ firstName: 'Ama' });

    service.upsertProfile({ firstName: 'Ama', lastName: 'Serwaa' }).subscribe();
    const put = httpMock.expectOne(`${base}/profile`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toMatchObject({ firstName: 'Ama', lastName: 'Serwaa' });
    put.flush({ id: 'p1', firstName: 'Ama', lastName: 'Serwaa' });
  });

  it('uploads documents as multipart form data with conditional fields', () => {
    const file = new File(['%PDF-fake'], 'license.pdf', { type: 'application/pdf' });
    service.uploadDocument(file, 'LICENSE', { expiryDate: '2027-01-31' }).subscribe();
    const req = httpMock.expectOne(`${base}/documents`);
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('type')).toBe('LICENSE');
    expect(body.get('expiryDate')).toBe('2027-01-31');
    expect(body.get('otherLabel')).toBeNull();
    expect(body.get('file')).toBe(file);
    req.flush({ id: 'doc-1', type: 'LICENSE' });
  });

  it('lists own documents', () => {
    service.listDocuments().subscribe();
    const req = httpMock.expectOne(`${base}/documents`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  /**
   * Both of these 404 as a matter of course — a clinician seeded or invited rather than hired
   * through the careers page has neither an application nor, at first, a profile. Their callers
   * treat that as an ordinary outcome, so the requests opt out of the interceptor's error banner.
   * Untreated, `applications/me` is polled from the shell on every navigation and put a red
   * "Not found" over every page in the portal.
   */
  it.each([
    ['getOwnApplication', 'applications/me'],
    ['getOwnProfile', 'profile'],
  ])('should keep %s out of the global error banner', (method, path) => {
    (service as any)[method]().subscribe({ error: () => undefined });

    const req = httpMock.expectOne(`${base}/${path}`);
    expect(req.request.context.get(SKIP_ERROR_ALERT)).toBe(true);
    req.flush(null, { status: 404, statusText: 'Not Found' });
  });
});
