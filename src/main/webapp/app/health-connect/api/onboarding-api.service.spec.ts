import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';
import { OnboardingApiService } from './onboarding-api.service';

describe('OnboardingApiService', () => {
  let service: OnboardingApiService;
  let httpMock: HttpTestingController;
  let base: string;
  let documentBase: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OnboardingApiService);
    httpMock = TestBed.inject(HttpTestingController);
    base = TestBed.inject(ApplicationConfigService).getEndpointFor('api/onboarding', 'professionalservice');
    documentBase = TestBed.inject(ApplicationConfigService).getEndpointFor('api/personal-document', 'professionalservice');
  });

  afterEach(() => httpMock.verify());

  /**
   * The one request to `url`, once whatever asynchronous work precedes it has finished.
   *
   * <p>`expectOne` asserts against the requests open *now*, so it cannot be used for a call that is
   * issued after a `FileReader` resolves. `match` is used rather than `expectOne` because it returns
   * an empty array instead of throwing, which is what makes polling possible at all.
   */
  const waitForRequest = async (url: string): Promise<TestRequest> => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const [request] = httpMock.match(url);
      if (request) {
        return request;
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    throw new Error(`no request to ${url}`);
  };

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

  /**
   * ⚠ The document calls are on `api/personal-document`, not under `api/onboarding` (profile.md
   * step 3, T2) — and `documentBase` is derived here for the same reason `base` is, so a spec cannot
   * agree with a hardcoded path the service no longer uses.
   */
  it('uploads documents as the specified JSON document with data base64-encoded', async () => {
    const file = new File(['%PDF-fake'], 'license.pdf', { type: 'application/pdf' });
    let created: unknown;
    service.uploadDocument(file, 'LICENSE', { expiryDate: '2027-01-31' }).subscribe(document => (created = document));

    // ⚠ The file is read before the request is built, so the request does not exist synchronously —
    // and ONE macrotask is not enough. jsdom's FileReader schedules its own load event, and whether
    // that lands before or after a single `setTimeout(0)` depends on machine load: this spec passed
    // alone and failed inside the full suite, which is the worst kind of flake because the isolated
    // run is the one a developer repeats. Polling until the request appears removes the race rather
    // than widening the window.
    const req = await waitForRequest(documentBase);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'license.pdf',
      type: 'LICENSE',
      // base64 of '%PDF-fake' — asserted as the value rather than as "some string", because the
      // server verifies magic bytes against `dataContentType` and a mangled payload would be a 400
      // that reads as a rejected file.
      data: btoa('%PDF-fake'),
      dataContentType: 'application/pdf',
      otherLabel: null,
      expiryDate: '2027-01-31',
      supersedesDocumentId: null,
    });
    req.flush({ id: 'doc-1', type: 'LICENSE' });
    expect(created).toEqual({ id: 'doc-1', type: 'LICENSE' });
  });

  it('lists own documents', () => {
    service.listDocuments().subscribe();
    const req = httpMock.expectOne(documentBase);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('streams document content from the personal-document path', () => {
    service.documentContent('doc-1').subscribe();
    const req = httpMock.expectOne(`${documentBase}/doc-1/content`);
    expect(req.request.method).toBe('GET');
    req.flush(new Blob(['%PDF']));
  });

  /**
   * ⛔ The reviewer's two verbs stay where they are — they are `ROLE_ADMIN`, they are still served
   * from `/api/onboarding/documents/{id}/...`, and they migrate with the rest of the admin surface in
   * T3. This case is what fails if somebody "finishes the rename".
   */
  it('leaves the reviewer verdicts on the onboarding surface until T3', () => {
    service.verifyDocument('doc-1').subscribe();
    const verify = httpMock.expectOne(`${base}/documents/doc-1/verify`);
    expect(verify.request.method).toBe('PUT');
    httpMock.expectNone(`${documentBase}/doc-1/verify`);
    verify.flush({ id: 'doc-1', type: 'LICENSE', verificationStatus: 'VERIFIED' });

    service.rejectDocument('doc-1', 'Blurry scan').subscribe();
    const reject = httpMock.expectOne(`${base}/documents/doc-1/reject`);
    expect(reject.request.method).toBe('PUT');
    reject.flush({ id: 'doc-1', type: 'LICENSE', verificationStatus: 'REJECTED' });
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
