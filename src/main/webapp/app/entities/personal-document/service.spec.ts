import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';
import { PersonalDocumentService } from './service';

describe('PersonalDocumentService', () => {
  let service: PersonalDocumentService;
  let httpMock: HttpTestingController;
  let base: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PersonalDocumentService);
    httpMock = TestBed.inject(HttpTestingController);
    base = TestBed.inject(ApplicationConfigService).getEndpointFor('api/personal-document', 'professionalservice');
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

  it('lists own documents', () => {
    service.query().subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  /**
   * ⚠ The upload is `profile.md`'s specified JSON `PersonalDocument` shape, with `data`
   * base64-encoded (step 3, T2) — asserted as the value rather than as "some string", because the
   * server verifies magic bytes against `dataContentType` and a mangled payload would be a 400 that
   * reads as a rejected file.
   */
  it('uploads documents as the specified JSON document with data base64-encoded', async () => {
    const file = new File(['%PDF-fake'], 'license.pdf', { type: 'application/pdf' });
    let created: unknown;
    service.create(file, 'LICENSE', { expiryDate: '2027-01-31' }).subscribe(document => (created = document));

    // ⚠ The file is read before the request is built, so the request does not exist synchronously —
    // and ONE macrotask is not enough. jsdom's FileReader schedules its own load event, and whether
    // that lands before or after a single `setTimeout(0)` depends on machine load. Polling until the
    // request appears removes the race rather than widening the window.
    const req = await waitForRequest(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'license.pdf',
      type: 'LICENSE',
      data: btoa('%PDF-fake'),
      dataContentType: 'application/pdf',
      otherLabel: null,
      expiryDate: '2027-01-31',
      supersedesDocumentId: null,
    });
    req.flush({ id: 'doc-1', type: 'LICENSE' });
    expect(created).toEqual({ id: 'doc-1', type: 'LICENSE' });
  });

  it('streams document content, loud by default', () => {
    service.content('doc-1').subscribe();
    const req = httpMock.expectOne(`${base}/doc-1/content`);
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SKIP_ERROR_ALERT)).toBe(false);
    req.flush(new Blob(['%PDF']));
  });

  /**
   * The silent read is the preview column's: it has a visible placeholder of its own, and a page
   * fetching one blob per document row would otherwise stack one banner per failure.
   */
  it('opts a silent content read out of the global error banner', () => {
    service.content('doc-1', { silent: true }).subscribe({ error: () => undefined });
    const req = httpMock.expectOne(`${base}/doc-1/content`);
    expect(req.request.context.get(SKIP_ERROR_ALERT)).toBe(true);
    req.flush(null, { status: 404, statusText: 'Not Found' });
  });

  /** The avatar body carries no `type` and no `name` — the handler stores `AVATAR` and nothing else. */
  it('posts the avatar to its own path with only data and content type', () => {
    service.createAvatar('aGk=', 'image/jpeg').subscribe();
    const req = httpMock.expectOne(`${base}/avatar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ data: 'aGk=', dataContentType: 'image/jpeg' });
    req.flush({ id: 'doc-9', type: 'AVATAR' });
  });

  /** The `User.imageUrl` value — the content path, one spelling, built from the same base. */
  it('builds the avatar content path from the shared base', () => {
    expect(service.avatarContentPath('doc-9')).toBe(`${base}/doc-9/content`);
  });
});
