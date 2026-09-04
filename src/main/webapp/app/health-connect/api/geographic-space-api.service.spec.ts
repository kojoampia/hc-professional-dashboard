import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GeographicSpaceApiService } from './geographic-space-api.service';

/**
 * "Resolve and cache; do not model the tree here" — the rule this client exists to keep.
 *
 * <p>hc-admin owns `GeographicSpace`, and this product stores the id on a round opaquely. What is
 * worth pinning is not the URL so much as the three ways this could go wrong at display time: a
 * request per round, a stall when hc-admin is down, and a retry storm from a failure that is not
 * remembered.
 */
describe('GeographicSpaceApiService', () => {
  let service: GeographicSpaceApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GeographicSpaceApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads the space from adminservice, which owns the geography', () => {
    const seen: (string | null)[] = [];
    service.name('space-osu').subscribe(name => seen.push(name));

    const req = httpMock.expectOne(request => request.url.endsWith('services/adminservice/api/geographic-spaces/space-osu'));
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'space-osu', name: 'Osu', type: 'DISTRICT', parentId: 'space-accra' });

    expect(seen).toEqual(['Osu']);
  });

  /**
   * One request for an id, however many rounds ask.
   *
   * <p>A roster view resolves the same handful of ids on every render. Without the cache this is a
   * request per round per change detection, against another stack, on a screen a clinician is
   * looking at.
   */
  it('asks once per id however many callers there are', () => {
    service.name('space-osu').subscribe();
    service.name('space-osu').subscribe();
    httpMock.expectOne(request => request.url.endsWith('/geographic-spaces/space-osu')).flush({ id: 'space-osu', name: 'Osu' });

    const seen: (string | null)[] = [];
    service.name('space-osu').subscribe(name => seen.push(name));

    expect(seen).toEqual(['Osu']);
    httpMock.verify();
  });

  /**
   * A failure is null, and it is remembered as null.
   *
   * <p>Both halves matter. Answering null keeps a round readable when hc-admin is unreachable — the
   * area is a nicety and the round is the information. Caching it stops the screen re-asking a
   * service that is down, once per round, for as long as somebody leaves the tab open.
   */
  it('answers null when hc-admin cannot be reached, and does not ask again', () => {
    const seen: (string | null)[] = [];
    service.name('space-osu').subscribe(name => seen.push(name));
    httpMock.expectOne(request => request.url.endsWith('/geographic-spaces/space-osu')).error(new ProgressEvent('network error'));

    service.name('space-osu').subscribe(name => seen.push(name));

    expect(seen).toEqual([null, null]);
    httpMock.verify();
  });

  /** No id is no request. Most rounds written before the planner existed carry none. */
  it('makes no request for a round with no space', () => {
    const seen: (string | null)[] = [];
    service.name(null).subscribe(name => seen.push(name));
    service.name(undefined).subscribe(name => seen.push(name));
    service.name('').subscribe(name => seen.push(name));

    expect(seen).toEqual([null, null, null]);
    httpMock.verify();
  });

  /** An id is opaque, so it is encoded rather than trusted to be URL-safe. */
  it('encodes the id into the path', () => {
    service.name('space/with a slash').subscribe();
    const req = httpMock.expectOne(request => request.url.includes('space%2Fwith%20a%20slash'));
    req.flush({ id: 'space/with a slash', name: 'Odd' });
  });
});
