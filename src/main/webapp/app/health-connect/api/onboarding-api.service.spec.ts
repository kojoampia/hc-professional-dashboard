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
  let profileBase: string;
  let applicationBase: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OnboardingApiService);
    httpMock = TestBed.inject(HttpTestingController);
    base = TestBed.inject(ApplicationConfigService).getEndpointFor('api/onboarding', 'professionalservice');
    documentBase = TestBed.inject(ApplicationConfigService).getEndpointFor('api/personal-document', 'professionalservice');
    profileBase = TestBed.inject(ApplicationConfigService).getEndpointFor('api/profile', 'professionalservice');
    applicationBase = TestBed.inject(ApplicationConfigService).getEndpointFor('api/professional-application', 'professionalservice');
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

  /**
   * ⚠ **On `api/professional-application`, not under `api/onboarding` (profile.md step 4, T3).**
   * The body is step 4's model — `agreed` and `authority` — and it was
   * `{ requestedRole, consentAccepted }`. Both halves are asserted here because the server binds an
   * allow-list record: a stale field name is not refused, it is simply not heard, so a rename left
   * behind would have stored `authority: null` and answered 201 doing it.
   */
  it('starts an application with consent against the step 4 endpoint', () => {
    service.startApplication('ROLE_NURSE').subscribe();
    const req = httpMock.expectOne(applicationBase);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ agreed: true, authority: 'ROLE_NURSE', source: null });
    httpMock.expectNone(`${base}/applications`);
    req.flush({ id: 'app-1', accountId: 'me', status: 'APPLICATION_STARTED' });
  });

  it('carries the careers attribution source when present', () => {
    service.startApplication('ROLE_DOCTOR', 'web-careers').subscribe();
    const req = httpMock.expectOne(applicationBase);
    expect(req.request.body).toEqual({ agreed: true, authority: 'ROLE_DOCTOR', source: 'web-careers' });
    req.flush({ id: 'app-1', accountId: 'me', status: 'APPLICATION_STARTED' });
  });

  it('drives the lifecycle endpoints', () => {
    service.getOwnApplication().subscribe();
    httpMock.expectOne(`${applicationBase}/me`).flush({ id: 'app-1', accountId: 'me', status: 'APPLICATION_STARTED' });

    service.completeProfile().subscribe();
    const complete = httpMock.expectOne(`${applicationBase}/me/complete-profile`);
    expect(complete.request.method).toBe('PUT');
    complete.flush({ id: 'app-1', accountId: 'me', status: 'PROFILE_COMPLETED' });

    service.submit('ROLE_NURSE').subscribe();
    const submit = httpMock.expectOne(`${applicationBase}/me/submit`);
    expect(submit.request.method).toBe('PUT');
    expect(submit.request.body).toEqual({ agreed: true, authority: 'ROLE_NURSE' });
    submit.flush({ id: 'app-1', accountId: 'me', status: 'CREDENTIAL_REVIEW' });

    service.events('app-1').subscribe();
    httpMock.expectOne(`${applicationBase}/app-1/events`).flush([]);
  });

  /**
   * ⭐ Step 4's **Save**, which is the same server operation as Submit under a second path — see
   * `OnboardingService.submitForReview` for why a Kafka-less Save variant was refused. The two
   * bodies are identical and that is the point: the difference between the buttons is the wizard's.
   */
  it('saves the consent and authority through the step 4 write', () => {
    service.saveConsent('ROLE_PARAMEDIC').subscribe();
    const req = httpMock.expectOne(`${applicationBase}/me`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ agreed: true, authority: 'ROLE_PARAMEDIC' });
    req.flush({ id: 'app-1', accountId: 'me', status: 'CREDENTIAL_REVIEW' });
  });

  /**
   * The reviewer's reads and transitions moved with the rest of the surface. Spot-checked across
   * the three shapes — the queue, an `/{id}` read and an `/{id}` transition — rather than all
   * eleven, because they share one base constant and the risk is that constant, not each template.
   */
  it('drives the reviewer surface on the new base', () => {
    service.listApplications('CREDENTIAL_REVIEW').subscribe();
    const queue = httpMock.expectOne(r => r.url === applicationBase);
    expect(queue.request.params.get('status')).toBe('CREDENTIAL_REVIEW');
    queue.flush([]);

    service.applicationDocuments('app-1').subscribe();
    httpMock.expectOne(`${applicationBase}/app-1/documents`).flush([]);

    service.activate('app-1').subscribe();
    const activate = httpMock.expectOne(`${applicationBase}/app-1/activate`);
    expect(activate.request.method).toBe('PUT');
    activate.flush({ id: 'app-1', accountId: 'me', status: 'ACTIVE' });
  });

  /**
   * ⚠ **On `api/profile`, not under `api/onboarding` (profile.md step 2, F8).** The server mappings
   * for `GET`/`PUT /api/onboarding/profile` are gone, so this assertion is what notices if the base
   * is ever put back: a request to the old path would be a consumer reading where nobody serves,
   * which on the read half is a 404 the page treats as "no profile yet" and therefore cannot see.
   */
  it('round-trips the profile through its own endpoint', () => {
    service.getOwnProfile().subscribe();
    httpMock.expectOne(profileBase).flush({ firstName: 'Ama' });

    service.upsertProfile({ firstName: 'Ama', lastName: 'Serwaa' }).subscribe();
    const put = httpMock.expectOne(profileBase);
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
   * ⭐ **The reviewer's two verdicts are on `api/personal-document` since T3.**
   *
   * <p>This case asserted the opposite until then — that they were *still* on
   * `/api/onboarding/documents/{id}/...` — and said in as many words that it was what fails if
   * somebody "finishes the rename". T3 is the task that finishes it, and
   * `PersonalDocumentReviewResource` is where they are served from, so the `expectNone` has been
   * turned round: the old path is now the one nothing may call.
   */
  it('puts the reviewer verdicts on the personal-document base', () => {
    service.verifyDocument('doc-1').subscribe();
    const verify = httpMock.expectOne(`${documentBase}/doc-1/verify`);
    expect(verify.request.method).toBe('PUT');
    httpMock.expectNone(`${base}/documents/doc-1/verify`);
    verify.flush({ id: 'doc-1', type: 'LICENSE', verificationStatus: 'VERIFIED' });

    service.rejectDocument('doc-1', 'Blurry scan').subscribe();
    const reject = httpMock.expectOne(`${documentBase}/doc-1/reject`);
    expect(reject.request.method).toBe('PUT');
    reject.flush({ id: 'doc-1', type: 'LICENSE', verificationStatus: 'REJECTED' });
  });

  /**
   * Both of these 404 as a matter of course — a clinician seeded or invited rather than hired
   * through the careers page has neither an application nor, at first, a profile. Their callers
   * treat that as an ordinary outcome, so the requests opt out of the interceptor's error banner.
   * Untreated, `professional-application/me` is polled from the shell on every navigation and put a red
   * "Not found" over every page in the portal.
   */
  it.each([
    ['getOwnApplication', () => `${applicationBase}/me`],
    // Its own base since F8 — see the round-trip case above.
    ['getOwnProfile', () => profileBase],
  ])('should keep %s out of the global error banner', (method, url) => {
    (service as any)[method]().subscribe({ error: () => undefined });

    const req = httpMock.expectOne((url as () => string)());
    expect(req.request.context.get(SKIP_ERROR_ALERT)).toBe(true);
    req.flush(null, { status: 404, statusText: 'Not Found' });
  });
});
