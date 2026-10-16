import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { OnboardingApiService } from './onboarding-api.service';

describe('OnboardingApiService', () => {
  let service: OnboardingApiService;
  let httpMock: HttpTestingController;
  let base: string;
  let documentBase: string;
  let applicationBase: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OnboardingApiService);
    httpMock = TestBed.inject(HttpTestingController);
    base = TestBed.inject(ApplicationConfigService).getEndpointFor('api/onboarding', 'professionalservice');
    documentBase = TestBed.inject(ApplicationConfigService).getEndpointFor('api/personal-document', 'professionalservice');
    applicationBase = TestBed.inject(ApplicationConfigService).getEndpointFor('api/professional-application', 'professionalservice');
  });

  afterEach(() => httpMock.verify());

  /**
   * The two surfaces still genuinely under `/api/onboarding` — everything else this service once
   * carried moved to its own base, and the applicant's halves moved to the entities services in T6.
   */
  it('keeps the acknowledgement and the progress meter on the api/onboarding base', () => {
    service.acknowledgementStatus().subscribe();
    httpMock.expectOne(`${base}/acknowledgement`).flush({ acknowledged: false });

    service.acknowledge().subscribe();
    const ack = httpMock.expectOne(`${base}/acknowledgement`);
    expect(ack.request.method).toBe('POST');
    ack.flush(null);

    service.progress().subscribe();
    httpMock.expectOne(`${base}/progress`).flush({
      percent: 0,
      complete: false,
      status: null,
      requirements: [],
      steps: { account: false, profile: false, documents: false, consent: false },
    });
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

    service.events('app-1').subscribe();
    httpMock.expectOne(`${applicationBase}/app-1/events`).flush([]);
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
});
