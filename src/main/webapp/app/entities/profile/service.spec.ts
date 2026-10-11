import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SKIP_ERROR_ALERT } from 'app/core/interceptor/error-handler.interceptor';
import { ProfileService } from './service';

const URL = 'services/professionalservice/api/profile';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /**
   * ⚠ **The SINGULAR path.** `/api/profiles` exists, is a different thing, and is `ROLE_ADMIN` on
   * its subject-addressed reads; `/api/profile` resolves the caller from the token.
   */
  it('should read the caller own profile from the singular path', () => {
    service.find().subscribe();

    const request = httpMock.expectOne(req => req.method === 'GET');
    expect(request.request.url).toBe(URL);
    expect(request.request.url).not.toContain('/profiles');
    request.flush({ id: 'p-1' });
  });

  /**
   * A 404 is "no profile yet" — an applicant has an account before they have a profile — so it is
   * opted out of the global error banner. The untreated version of this exact 404 put a red
   * "Not found" over a working page.
   */
  it('should opt the read out of the global error banner', () => {
    service.find().subscribe({ error: () => undefined });

    const request = httpMock.expectOne(req => req.method === 'GET');
    expect(request.request.context.get(SKIP_ERROR_ALERT)).toBe(true);
    request.flush('none', { status: 404, statusText: 'Not Found' });
  });

  it('should write with PUT, on the same singular path', () => {
    service.update({ id: 'p-1', mobilePhone: '+233200000000' }).subscribe();

    const request = httpMock.expectOne(req => req.method === 'PUT');
    expect(request.request.url).toBe(URL);
    expect(request.request.body).toEqual({ id: 'p-1', mobilePhone: '+233200000000' });
    request.flush({ id: 'p-1' });
  });

  /**
   * ⛔ Two methods, and the write is not opted out: a refused **write** must surface. `profile.md`
   * specifies no delete and `ProfileResource` has none on purpose (`backlog.md` item 56).
   */
  it('should expose a read and a write and nothing else', () => {
    expect(
      Object.getOwnPropertyNames(ProfileService.prototype)
        .filter(name => name !== 'constructor')
        .sort(),
    ).toEqual(['find', 'update']);
  });
});
