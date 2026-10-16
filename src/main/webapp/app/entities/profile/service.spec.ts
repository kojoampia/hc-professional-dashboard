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

  /**
   * ⛔ **The write goes out in the WRITE vocabulary, which is not the read's** (T6). `GET
   * /api/profile` answers the entity — `mobilePhone`, contacts with `phone` — but `PUT /api/profile`
   * binds the frozen `ProfileDTO`, whose wire is `mobileNumber` and contacts with `phoneNumber`
   * (`ProfileMapper.toEntity`: `setMobilePhone(dto.getMobileNumber())`). Unknown keys are silently
   * dropped on the server, so a body in read vocabulary answers 200 **and loses those fields** —
   * which is exactly what the pane's save did until this translation existed. The read-vocabulary
   * keys must be absent, not merely duplicated: they are the proof the translation ran.
   */
  it('should write with PUT in the frozen ProfileDTO vocabulary, on the same singular path', () => {
    service.update({ id: 'p-1', mobilePhone: '+233200000000' }).subscribe();

    const request = httpMock.expectOne(req => req.method === 'PUT');
    expect(request.request.url).toBe(URL);
    expect(request.request.body).toEqual({ id: 'p-1', mobileNumber: '+233200000000' });
    request.flush({ id: 'p-1', mobilePhone: '+233200000000' });
  });

  /**
   * Every contact is translated — `phone` ⟶ `phoneNumber` — and everything else on it survives.
   * "Other contacts survive a save" is the half that matters: the contacts list is a replace when
   * named, so a translation that touched only the first contact would store the second one
   * phone-less and answer 200 doing it.
   */
  it('should translate every contact phone and carry the rest of each contact untouched', () => {
    service
      .update({
        id: 'p-1',
        birthDate: '1990-01-31',
        contacts: [
          { id: 'c-1', name: 'Ama', relationship: 'Sister', email: 'ama@example.test', phone: '+233200000001', address: { town: 'Aburi' } },
          {
            id: 'c-2',
            name: 'Kofi',
            relationship: 'Brother',
            email: 'kofi@example.test',
            phone: '+233200000002',
            address: { town: 'Tema' },
          },
        ],
      })
      .subscribe();

    const request = httpMock.expectOne(req => req.method === 'PUT');
    expect(request.request.body).toEqual({
      id: 'p-1',
      birthDate: '1990-01-31',
      contacts: [
        {
          id: 'c-1',
          name: 'Ama',
          relationship: 'Sister',
          email: 'ama@example.test',
          phoneNumber: '+233200000001',
          address: { town: 'Aburi' },
        },
        {
          id: 'c-2',
          name: 'Kofi',
          relationship: 'Brother',
          email: 'kofi@example.test',
          phoneNumber: '+233200000002',
          address: { town: 'Tema' },
        },
      ],
    });
    request.flush({ id: 'p-1' });
  });

  /**
   * `PUT /api/profile` is a partial write — an absent field is left as stored — so the translation
   * must not invent keys the caller did not name: a `mobileNumber` or `contacts` key manufactured
   * out of nothing would be a write the pane never asked for.
   */
  it('should not add write-vocabulary keys the caller did not name', () => {
    service.update({ id: 'p-1', cardNumber: 'GHA-123' }).subscribe();

    const request = httpMock.expectOne(req => req.method === 'PUT');
    expect(request.request.body).toEqual({ id: 'p-1', cardNumber: 'GHA-123' });
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
