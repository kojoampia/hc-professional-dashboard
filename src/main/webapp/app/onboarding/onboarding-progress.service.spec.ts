import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';

import { OnboardingProgressDto, OnboardingSteps } from 'app/health-connect/api/onboarding-api.service';
import { OnboardingProgressService } from './onboarding-progress.service';
import { OnboardingProgressStreamService, OnboardingStreamState } from './onboarding-progress-stream.service';

/** Four incomplete steps — the shape a fixture needs but no case here is about. */
const ALL_FALSE: OnboardingSteps = { account: false, profile: false, documents: false, consent: false };

describe('OnboardingProgressService', () => {
  let service: OnboardingProgressService;
  let httpMock: HttpTestingController;

  const progressRequest = () => httpMock.expectOne(request => request.url.endsWith('api/onboarding/progress'));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OnboardingProgressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('holds what the server says, and does not recompute it', () => {
    service.load();

    progressRequest().flush({ percent: 62, complete: false, requirements: [{ key: 'license', done: false }] });

    expect(service.percent()).toBe(62);
    expect(service.complete()).toBe(false);
    expect(service.progress()?.requirements).toEqual([{ key: 'license', done: false }]);
  });

  /**
   * The dashboard and the profile page both ask on init, and a clinician who lands on one and is
   * moved to the other would otherwise issue two requests for the same answer.
   */
  it('does not issue a second request while one is in flight', () => {
    service.load();
    service.load();

    progressRequest().flush({ percent: 0, complete: false, requirements: [] });
  });

  it('re-asks after a save that may have satisfied a requirement', () => {
    service.load();
    progressRequest().flush({ percent: 50, complete: false, requirements: [] });

    service.refresh();
    progressRequest().flush({ percent: 75, complete: false, requirements: [] });

    expect(service.percent()).toBe(75);
  });

  /**
   * Null, not false. Callers treat "incomplete" as a reason to move someone to their profile, and a
   * failed request must not do that to a clinician whose profile is finished.
   */
  it('leaves completion unknown when the request fails', () => {
    service.load();

    progressRequest().flush(null, { status: 500, statusText: 'Server Error' });

    expect(service.complete()).toBeNull();
    expect(service.progress()).toBeNull();
  });

  it('forgets the previous account on clear', () => {
    service.load();
    progressRequest().flush({ percent: 100, complete: true, requirements: [] });

    service.clear();

    expect(service.progress()).toBeNull();
    expect(service.complete()).toBeNull();
  });

  /**
   * The live push — `backlog.md` row 230, unit B.
   *
   * <p>⭐ **The property every case here protects is that the `GET` stays authoritative.** Row 230
   * settled it against this estate's signature failure: `application.kafka.enabled=false` is a
   * *supported* configuration, so a meter whose only input were events would sit at zero while the
   * service reported healthy. The push is an optimisation over re-reading; losing it must cost the
   * refresh and never the number.
   */
  describe('the live stream', () => {
    /** A stand-in transport, so these cases are about the service's reaction and not about SSE framing. */
    let frames: Subject<OnboardingProgressDto>;
    let reconnected: Subject<void>;
    let streamState: ReturnType<typeof signal<OnboardingStreamState>>;

    beforeEach(() => {
      frames = new Subject<OnboardingProgressDto>();
      reconnected = new Subject<void>();
      streamState = signal<OnboardingStreamState>('idle');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          {
            provide: OnboardingProgressStreamService,
            useValue: {
              watch: () => frames.asObservable(),
              state: streamState.asReadonly(),
              reconnected$: reconnected.asObservable(),
            },
          },
        ],
      });
      service = TestBed.inject(OnboardingProgressService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    it('applies a pushed meter without a request', () => {
      const stop = service.watch();

      frames.next({ percent: 89, complete: false, status: 'CREDENTIAL_REVIEW', requirements: [], steps: ALL_FALSE });

      expect(service.percent()).toBe(89);
      stop();
    });

    /**
     * ⛔ **The case that matters most in this unit.** A stream that drops must leave the meter exactly
     * as it was — the number on screen came from an authoritative read and is still true.
     *
     * <p>A client that cleared on stream error would blank a correct meter the first time a proxy
     * recycled a connection, which on a 120s `proxy_read_timeout` is routine rather than exceptional.
     */
    it('leaves an already-correct meter standing when the stream fails', () => {
      service.load();
      progressRequest().flush({ percent: 89, complete: false, requirements: [{ key: 'nextOfKin', done: false }] });

      const stop = service.watch();
      frames.error(new Error('socket closed'));

      expect(service.percent()).toBe(89);
      expect(service.progress()?.requirements).toEqual([{ key: 'nextOfKin', done: false }]);
      stop();
    });

    /**
     * ⭐ **A reconnect re-reads the authoritative `GET`**, because the stream carries no replay: any
     * number of changes happened while the socket was down, with nobody listening.
     *
     * <p>⚠ And it must fire on *re*-connection only — a first connection is the page's own `load()`
     * and a second request for the same answer is what the in-flight guard exists to prevent.
     */
    it('re-reads the authoritative meter after reconnecting', () => {
      const stop = service.watch();

      // Opening the stream alone asks for nothing: the page's own load() is the initial read, and
      // the transport fires reconnected$ only on a RECOVERY, never on the first connection.
      httpMock.expectNone(request => request.url.endsWith('api/onboarding/progress'));

      reconnected.next();

      progressRequest().flush({ percent: 100, complete: true, requirements: [] });
      expect(service.percent()).toBe(100);
      stop();
    });

    /** ⛔ And the re-read stops with the watch, or a closed page keeps polling on every reconnect. */
    it('stops re-reading once the watch is torn down', () => {
      const stop = service.watch();
      stop();

      reconnected.next();

      httpMock.expectNone(request => request.url.endsWith('api/onboarding/progress'));
    });

    it('reports the transport state without claiming it says anything about the meter', () => {
      expect(service.streamState()).toBe('idle');

      streamState.set('stalled');

      expect(service.streamState()).toBe('stalled');
      expect(service.progress()).toBeNull();
    });

    /** ⛔ Leaving the page must close the socket, or every visit leaks a reader and a retry loop. */
    it('stops applying frames once the watch is torn down', () => {
      const stop = service.watch();
      frames.next({ percent: 20, complete: false, status: null, requirements: [], steps: ALL_FALSE });

      stop();
      frames.next({ percent: 70, complete: false, status: null, requirements: [], steps: ALL_FALSE });

      expect(service.percent()).toBe(20);
    });
  });
});
