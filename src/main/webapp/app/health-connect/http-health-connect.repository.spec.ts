import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AlertService } from 'app/core/util/alert.service';
import { HttpHealthConnectRepository } from './http-health-connect.repository';

describe('HttpHealthConnectRepository', () => {
  let repository: HttpHealthConnectRepository;
  let httpMock: HttpTestingController;
  let alerts: string[];

  beforeEach(() => {
    // AlertService is stubbed rather than real: it pulls in TranslateService, and what these assert
    // is the repository's behaviour, not how an alert is rendered. `alerts` is captured so a test
    // can check a WRITE failure reports through here and not through the collection-level error.
    alerts = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpHealthConnectRepository,
        {
          provide: AlertService,
          useValue: { addAlert: (a: { translationKey?: string }) => alerts.push(a.translationKey ?? ''), showToast: () => undefined },
        },
      ],
    });
    repository = TestBed.inject(HttpHealthConnectRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('does NOT blank the collection when a WRITE fails', () => {
    // The regression this exists for, found by clicking Archive on the quality stack. Every mutation
    // used to call `this.error.set(...)` — the shared load-failure signal item 146 has since split
    // per read — which is what decides between the list and "Unable to load this information". So
    // one failed write replaced the whole case queue with an error panel, Retry re-ran the load and
    // never cleared the signal, and only a full page reload brought the list back.
    //
    // A LOAD failure blanking the collection is right: there is nothing to show. A WRITE failure is
    // not: the data on screen is still there and still correct. Splitting the reads gave a write no
    // state to blank either — the 403 below must not become the case read's refusal.
    // flushInitialLoad puts case-1 in the queue; without a real case archiveCase returns at its
    // guard and the test passes while exercising nothing.
    flushInitialLoad();
    expect(repository.caseQueueState().status).toBe('ready');

    expect(repository.archiveCase('case-1', 'a reason')).toBe(true);
    httpMock
      .match(request => request.url.includes('archive'))
      .forEach(request => request.flush({ message: 'denied' }, { status: 403, statusText: 'Forbidden' }));

    expect(repository.caseQueueState().status).toBe('ready');
    expect(repository.directoryState().status).toBe('ready');
    expect(alerts).toContain('healthConnect.toast.archiveFailed');
  });

  afterEach(() => httpMock.verify());

  const flushInitialLoad = () => {
    httpMock
      .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
      .flush(
        [{ id: 'patient-kojo', patientName: 'Kojo Ampia-Addison', lastActivityAt: '2026-07-20T05:00:00Z', sex: 'male', isChild: false }],
        { headers: { 'X-Total-Count': '1' } },
      );
    httpMock
      .expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases'))
      .flush(
        [
          {
            id: 'case-1',
            symptoms: 'Fever',
            diagnoses: '',
            recommendations: '',
            patientId: 'patient-kojo',
            status: 'urgent',
            brief: 'High fever',
            createdDate: '2026-07-20T05:00:00Z',
          },
        ],
        { headers: {} },
      );
    // Singular, and NOT /all: the dashboard reads the caller's own roster. Reaching for the
    // admin-only estate collection is what returned 403 to every clinician before DR1, so this is
    // matched exactly — the whole point of the fix is which of the two URLs gets called.
    httpMock.expectOne('services/professionalservice/api/duty-roster').flush([]);
  };

  it('loads the patient list and case queue on construction', () => {
    flushInitialLoad();

    expect(repository.patientRows()).toHaveLength(1);
    expect(repository.patientRows()[0].patientName).toBe('Kojo Ampia-Addison');

    expect(repository.caseQueue()).toHaveLength(1);
    expect(repository.caseQueue()[0]).toMatchObject({ id: 'case-1', status: 'urgent', brief: 'High fever', patientId: 'patient-kojo' });
    expect(repository.caseCounts()).toEqual({ urgent: 1, open: 0, treatment: 0, closed: 0 });
  });

  describe('one state per read, and a refusal is not an error (backlog item 146)', () => {
    // Measured on the quality stack as a technician, 2026-09-17, against the image these tests were
    // written for: `api/patients` 200 with 100 rows, `patientservice/api/clinical-cases` 403,
    // `api/duty-roster` 200. Every assertion below reproduces one leg of that.
    it('serves the directory rows it received while the case read is REFUSED', () => {
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
        .flush([{ id: 'patient-kojo', patientName: 'Kojo Ampia-Addison', lastActivityAt: null, sex: 'male', isChild: false }], {
          headers: { 'X-Total-Count': '1' },
        });
      httpMock
        .expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases'))
        .flush('nope', { status: 403, statusText: 'Forbidden' });
      httpMock.expectOne('services/professionalservice/api/duty-roster').flush([]);

      expect(repository.patientRows()).toHaveLength(1);
      expect(repository.directoryState()).toEqual({ status: 'ready', error: null });
      // Refused, not failed — and with its own key, because "unable to load this information"
      // invites a Retry that re-issues the same 403 for ever.
      expect(repository.caseQueueState()).toEqual({ status: 'forbidden', error: 'healthConnect.states.forbidden' });
    });

    it('calls a 503 on the same read an error, because that one IS transient', () => {
      // The discrimination in both directions. Without this, mapping every failure to `forbidden`
      // would pass the test above and withdraw the Retry from an outage that a Retry would fix.
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
        .flush([], { headers: { 'X-Total-Count': '0' } });
      httpMock
        .expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases'))
        .flush('nope', { status: 503, statusText: 'Service Unavailable' });
      httpMock.expectOne('services/professionalservice/api/duty-roster').flush([]);

      expect(repository.caseQueueState()).toEqual({ status: 'error', error: 'healthConnect.states.error' });
      expect(repository.directoryState().status).toBe('ready');
    });

    it('keeps a failed directory read out of the case queue’s state, and the converse', () => {
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
        .flush('nope', { status: 503, statusText: 'Service Unavailable' });
      httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases')).flush([], { headers: {} });
      httpMock.expectOne('services/professionalservice/api/duty-roster').flush([]);

      expect(repository.directoryState().status).toBe('error');
      expect(repository.caseQueueState().status).toBe('ready');
    });

    it('CONTAINS a failed record read to that patient, leaving the directory and the queue alone', async () => {
      // The two writers the row calls the worst of the four: a record read that went wrong used to
      // blank the directory, the dashboard and the case queue — pages the clinician was not looking
      // at and that had read nothing broken.
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      await Promise.resolve(); // the read is deferred out of the caller's reactive context — see findPatient
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients/patient-kojo'))
        .flush('nope', { status: 403, statusText: 'Forbidden' });

      expect(repository.recordState('patient-kojo')).toEqual({ status: 'forbidden', error: 'healthConnect.states.forbidden' });
      expect(repository.directoryState().status).toBe('ready');
      expect(repository.caseQueueState().status).toBe('ready');
      expect(repository.patientRows()).toHaveLength(1);
      expect(repository.caseQueue()).toHaveLength(1);
    });

    it('contains a 200-with-no-body to that patient too, which is the other record writer', async () => {
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      await Promise.resolve(); // the read is deferred out of the caller's reactive context — see findPatient
      httpMock.expectOne(request => request.url.endsWith('services/professionalservice/api/patients/patient-kojo')).flush(null);

      expect(repository.recordState('patient-kojo')).toEqual({ status: 'error', error: 'healthConnect.states.error' });
      expect(repository.directoryState().status).toBe('ready');
      expect(repository.caseQueueState().status).toBe('ready');
    });

    it('reports one patient’s refused record without touching another’s', async () => {
      // Keyed per patient for `recordRestrictionCache`'s reason: records are cached and a clinician
      // moves between them, so one value would describe the newest read while an older record is on
      // screen.
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      await Promise.resolve(); // the read is deferred out of the caller's reactive context — see findPatient
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients/patient-kojo'))
        .flush('nope', { status: 403, statusText: 'Forbidden' });

      expect(repository.recordState('patient-kojo').status).toBe('forbidden');
      expect(repository.recordState('patient-ama').status).toBe('idle');
    });
  });

  describe('every stored state refuses mutation at runtime (backlog item 180)', () => {
    // The write each of these plants is the one the row names — "clear this error to ready" — cast
    // past `readonly`, against a STORED failure state. Item 173 froze only the three shared
    // constants, so this exact write succeeded silently on `error` and `forbidden`, the two states
    // a caller is most likely to reach for. Every state now comes frozen out of one `asyncState`
    // builder; the writes throw rather than no-op because specs, like the emitted app modules, run
    // in strict mode.
    //
    // Asserted by attempting the write rather than by `Object.isFrozen`, because the write
    // throwing IS the guarantee — and the state is re-read afterwards so a silent no-op that
    // somehow returned would still fail the test on the value.
    it('throws on a mutation of the directory read’s stored ERROR state, leaving it intact', () => {
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
        .flush('nope', { status: 503, statusText: 'Service Unavailable' });
      httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases')).flush([], { headers: {} });
      httpMock.expectOne('services/professionalservice/api/duty-roster').flush([]);

      const state = repository.directoryState() as { status: string };
      expect(() => (state.status = 'ready')).toThrow(TypeError);
      expect(repository.directoryState().status).toBe('error');
    });

    it('throws on a mutation of the case queue’s stored FORBIDDEN state, leaving it intact', () => {
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
        .flush([], { headers: { 'X-Total-Count': '0' } });
      httpMock
        .expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases'))
        .flush('nope', { status: 403, statusText: 'Forbidden' });
      httpMock.expectOne('services/professionalservice/api/duty-roster').flush([]);

      const state = repository.caseQueueState() as { status: string };
      expect(() => (state.status = 'ready')).toThrow(TypeError);
      expect(repository.caseQueueState().status).toBe('forbidden');
    });

    it('throws on a mutation of a record read’s no-body ERROR state — the site row 181 absorbed', async () => {
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      await Promise.resolve(); // the read is deferred out of the caller's reactive context — see findPatient
      httpMock.expectOne(request => request.url.endsWith('services/professionalservice/api/patients/patient-kojo')).flush(null);

      const state = repository.recordState('patient-kojo') as { status: string };
      expect(() => (state.status = 'ready')).toThrow(TypeError);
      expect(repository.recordState('patient-kojo').status).toBe('error');
    });
  });

  describe('X-Restricted-Parts on the directory read (backlog item 114)', () => {
    // `api/` emits the header only when a composed part was refused, so the empty case has to stay
    // empty — and the tokens have to survive the trip from the response to the signal the screen
    // reads. Measured on the quality stack 2026-09-11: pharmacist and chemist get `lastActivity`,
    // technician gets `caseAssignments,lastActivity`, the other five get no header at all.
    it('reports nothing restricted when the response carried no header', () => {
      flushInitialLoad();

      expect(repository.directoryRestrictions()).toEqual([]);
    });

    it('reports the one part a pharmacist was refused', () => {
      flushDirectory({ 'X-Restricted-Parts': 'lastActivity' });

      expect(repository.directoryRestrictions()).toEqual(['lastActivity']);
    });

    it('reports both parts a technician was refused, in the order the header named them', () => {
      flushDirectory({ 'X-Restricted-Parts': 'caseAssignments,lastActivity' });

      expect(repository.directoryRestrictions()).toEqual(['caseAssignments', 'lastActivity']);
    });

    it('drops a token it does not know rather than passing it to the screen', () => {
      flushDirectory({ 'X-Restricted-Parts': 'medications,lastActivity' });

      expect(repository.directoryRestrictions()).toEqual(['lastActivity']);
    });

    it('reports SEPARATELY that a token was dropped, so a count can refuse to be stated', () => {
      // Item 125. The token is still kept off every screen; what changes is that the fact of it is
      // no longer thrown away. An unknown part may be row-removing, and a bundle older than the
      // service it is talking to is the ordinary case here, not a remote one.
      flushDirectory({ 'X-Restricted-Parts': 'medications,lastActivity' });

      expect(repository.directoryRestrictions()).toEqual(['lastActivity']);
      expect(repository.directoryNamedUnknownPart()).toBe(true);
    });

    it.each([
      ['no header at all', {}],
      ['a header naming only known parts', { 'X-Restricted-Parts': 'caseAssignments,lastActivity' }],
      ['a trailing comma', { 'X-Restricted-Parts': 'lastActivity,' }],
    ])('reports no unknown part for %s', (_label, headers) => {
      // The silent case has to stay silent in both directions: a false positive here suppresses
      // four correct figures on every dashboard in the estate.
      flushDirectory(headers);

      expect(repository.directoryNamedUnknownPart()).toBe(false);
    });

    it('KEEPS the restrictions when a later directory read fails, because the rows it described are still on screen', () => {
      // The defect item 125's review found, and it restores the very screen item 125 removes.
      //
      // This arm used to clear the restrictions. It does not clear `patientRowCache`, and neither
      // does `reset()` — so after a failed refresh the short rows were still cached with nothing
      // left saying they were short, and the dashboard's demographic cards, which sit outside
      // `<hpd-async-state>`, went back to rendering four confident totals over a shortened list.
      //
      // The rows and what was withheld from them are written together and must stay together. If
      // the cache is ever cleared on a failed read, clear these in the same statement.
      flushDirectory({ 'X-Restricted-Parts': 'caseAssignments,medications' });
      const rowsBefore = repository.patientRows();
      expect(repository.directoryRestrictions()).toEqual(['caseAssignments']);
      expect(repository.directoryNamedUnknownPart()).toBe(true);

      repository.reset();
      flushRestOfLoad();
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
        .flush('nope', { status: 503, statusText: 'Service Unavailable' });

      expect(repository.directoryState().status).toBe('error');
      // Both halves, because the pair is the property: stale rows with a stale restriction describe
      // each other, and either one alone is the wrong screen.
      expect(repository.patientRows()).toEqual(rowsBefore);
      expect(repository.directoryRestrictions()).toEqual(['caseAssignments']);
      expect(repository.directoryNamedUnknownPart()).toBe(true);
    });

    /** The initial load, with a chosen set of headers on the directory response alone. */
    const flushDirectory = (headers: Record<string, string>): void => {
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
        .flush([{ id: 'patient-kojo', patientName: 'Kojo Ampia-Addison', lastActivityAt: null, sex: 'male', isChild: false }], {
          headers: { 'X-Total-Count': '1', ...headers },
        });
      flushRestOfLoad();
    };

    const flushRestOfLoad = (): void => {
      httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases')).flush([], { headers: {} });
      httpMock.expectOne('services/professionalservice/api/duty-roster').flush([]);
    };

    describe('X-Restricted-Follow-Ups on the same read (backlog item 132)', () => {
      // A second header on the same response, answering a different question: not what this read
      // lost, but which read reached from a row will refuse. Measured through the gateway on
      // quality, 2026-09-17 — technician `record`, pharmacist and nurse no header at all.
      it('reports no blocked follow-up when the response carried no header', () => {
        flushInitialLoad();

        expect(repository.directoryRestrictedFollowUps()).toEqual([]);
      });

      it('reports the record read a technician cannot open', () => {
        flushDirectory({ 'X-Restricted-Parts': 'caseAssignments,lastActivity', 'X-Restricted-Follow-Ups': 'record' });

        expect(repository.directoryRestrictedFollowUps()).toEqual(['record']);
      });

      it('reports no blocked follow-up for a pharmacist, who is refused a part that still serves a record', () => {
        // The live asymmetry, and the reason this is a second header rather than a second reading of
        // the first: `lastActivity` is withheld from the list and the record opens anyway, so a
        // client inferring "refused something ⇒ cannot open" would withdraw a working link.
        flushDirectory({ 'X-Restricted-Parts': 'lastActivity' });

        expect(repository.directoryRestrictions()).toEqual(['lastActivity']);
        expect(repository.directoryRestrictedFollowUps()).toEqual([]);
      });

      it('drops a follow-up it does not know rather than passing it to the screen', () => {
        flushDirectory({ 'X-Restricted-Follow-Ups': 'cases,record' });

        expect(repository.directoryRestrictedFollowUps()).toEqual(['record']);
      });

      it('KEEPS the blocked follow-up when a later directory read fails, with the rows it describes', () => {
        // Item 125's invariant, extended to the third signal written from that one response. The
        // rows are not cleared on a failed read, so neither is what was said about them — clearing
        // this one alone would put a hundred live-looking links back over rows that still 503.
        flushDirectory({ 'X-Restricted-Parts': 'caseAssignments', 'X-Restricted-Follow-Ups': 'record' });
        const rowsBefore = repository.patientRows();

        repository.reset();
        flushRestOfLoad();
        httpMock
          .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
          .flush('nope', { status: 503, statusText: 'Service Unavailable' });

        expect(repository.directoryState().status).toBe('error');
        expect(repository.patientRows()).toEqual(rowsBefore);
        expect(repository.directoryRestrictedFollowUps()).toEqual(['record']);
      });
    });
  });

  it('reads the caller’s own roster and scopes "my roster" to assignments held by that professional', () => {
    httpMock
      .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
      .flush([], { headers: { 'X-Total-Count': '0' } });
    httpMock
      .expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases'))
      .flush(
        [
          { id: 'case-mine', patientId: 'p-1', status: 'open', brief: 'Mine', assignedRosterId: 'r-mine' },
          { id: 'case-theirs', patientId: 'p-2', status: 'open', brief: 'Theirs', assignedRosterId: 'r-theirs' },
        ],
        { headers: {} },
      );
    httpMock
      .expectOne('services/professionalservice/api/duty-roster')
      .flush([{ id: 'r-mine', date: '2026-08-20', duty: 'NURSE', professionalId: 'prof-1', shift: 'NIGHT', name: 'Ward 3' }]);

    expect(repository.dutyRosters()).toEqual([expect.objectContaining({ id: 'r-mine', shift: 'NIGHT', professionalId: 'prof-1' })]);
    expect(repository.listCases(undefined, 'mine', 'prof-1').map(row => row.id)).toEqual(['case-mine']);
    expect(
      repository
        .listCases(undefined, 'all')
        .map(row => row.id)
        .sort(),
    ).toEqual(['case-mine', 'case-theirs']);
    // Without an id we do not know who "me" is, so "mine" selects nothing rather than everything.
    expect(repository.listCases(undefined, 'mine')).toEqual([]);
  });

  it('lazily fetches a patient record on findPatient and populates it once the response lands', async () => {
    flushInitialLoad();

    expect(repository.findPatient('patient-kojo')).toBeUndefined();
    await Promise.resolve(); // deferred read — see findPatient

    const req = httpMock.expectOne(request => request.url.endsWith('services/professionalservice/api/patients/patient-kojo'));
    req.flush({
      id: 'patient-kojo',
      patientName: 'Kojo Ampia-Addison',
      lastActivityAt: '2026-07-20T05:00:00Z',
      sex: 'male',
      isChild: false,
      dateOfBirth: '1976-04-19',
      phone: '0242286304',
      email: 'kojo@jac.net',
      cases: [],
      visitations: [],
      activities: [],
      medications: [],
      reports: [],
    });

    expect(repository.findPatient('patient-kojo')?.patient.patientName).toBe('Kojo Ampia-Addison');
  });

  describe('X-Restricted-Parts on the record read (backlog item 126)', () => {
    // `api/`'s item 112 emits the same header on `GET /api/patients/{id}`, under the same
    // `lastActivity` token, when a pharmacist or chemist is served a record without its activity
    // log. Unread, the screen shows an empty activity panel — which is what a patient nobody has
    // touched looks like.

    it('reports nothing restricted when the record response carried no header', async () => {
      flushInitialLoad();
      expect(repository.findPatient('patient-kojo')).toBeUndefined();
      await Promise.resolve(); // deferred read — see findPatient
      flushRecord('patient-kojo');

      expect(repository.recordRestrictions('patient-kojo')).toEqual([]);
    });

    it('reports the part a pharmacist was refused on this record', async () => {
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      await Promise.resolve(); // the read is deferred out of the caller's reactive context — see findPatient
      flushRecord('patient-kojo', { 'X-Restricted-Parts': 'lastActivity' });

      expect(repository.recordRestrictions('patient-kojo')).toEqual(['lastActivity']);
      // The record itself still arrives — the whole point of item 112 is that it is served rather
      // than 503'd, with one collection missing from it.
      expect(repository.findPatient('patient-kojo')?.patient.patientName).toBe('Kojo Ampia-Addison');
    });

    it('drops a token it does not know rather than passing it to the screen', async () => {
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      await Promise.resolve(); // the read is deferred out of the caller's reactive context — see findPatient
      flushRecord('patient-kojo', { 'X-Restricted-Parts': 'medications,lastActivity' });

      expect(repository.recordRestrictions('patient-kojo')).toEqual(['lastActivity']);
    });

    it('keeps each record’s restriction with that record, not with the last read', async () => {
      // The reason this is a map and not a single signal. Records are cached and a clinician moves
      // between them, so one value would describe the newest response while an older record is on
      // screen — and "you may not read this patient's activity log" would be printed against a
      // patient nobody asked about.
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      await Promise.resolve(); // the read is deferred out of the caller's reactive context — see findPatient
      flushRecord('patient-kojo', { 'X-Restricted-Parts': 'lastActivity' });
      repository.findPatient('patient-ama');
      await Promise.resolve(); // the read is deferred out of the caller's reactive context — see findPatient
      flushRecord('patient-ama');

      expect(repository.recordRestrictions('patient-kojo')).toEqual(['lastActivity']);
      expect(repository.recordRestrictions('patient-ama')).toEqual([]);
    });

    it('reports nothing for a patient whose record was never fetched', () => {
      flushInitialLoad();

      expect(repository.recordRestrictions('patient-never-asked-for')).toEqual([]);
    });

    it('leaves no restriction behind when the record is dropped and the re-read fails', async () => {
      // The record is gone and the error panel replaces it, so a surviving "part of this record was
      // withheld" would explain a record that is no longer on screen.
      //
      // What holds it is `reset()` clearing the two caches together, NOT a clean-up in the error
      // handler: `findPatient` only fetches an id it has not cached, and the restriction is written
      // beside the record, so by the time an error arrives there is nothing under that key. This
      // spec once carried a clean-up in the error handler and a mutation proved the spec stayed
      // green without it — the code was dead and this test was passing for another reason.
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      await Promise.resolve(); // the read is deferred out of the caller's reactive context — see findPatient
      flushRecord('patient-kojo', { 'X-Restricted-Parts': 'lastActivity' });
      expect(repository.recordRestrictions('patient-kojo')).toEqual(['lastActivity']);

      repository.reset();
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      await Promise.resolve(); // the read is deferred out of the caller's reactive context — see findPatient
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients/patient-kojo'))
        .flush('nope', { status: 503, statusText: 'Service Unavailable' });

      expect(repository.recordState('patient-kojo').status).toBe('error');
      expect(repository.recordRestrictions('patient-kojo')).toEqual([]);
    });

    it('does not manufacture an empty record from a 200 with no body', async () => {
      // An empty `activities` array conjured out of a broken response is exactly the screen this
      // item exists to remove, arriving from the other direction — nothing withheld and nothing
      // recorded, said by the client rather than by the server.
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      await Promise.resolve(); // the read is deferred out of the caller's reactive context — see findPatient
      httpMock.expectOne(request => request.url.endsWith('services/professionalservice/api/patients/patient-kojo')).flush(null);

      // Asserted BEFORE asking again, because asking again re-requests: the read's state is
      // `loading` from the line below onwards, which is right and is not what this test is about.
      expect(repository.recordState('patient-kojo').status).toBe('error');
      expect(repository.findPatient('patient-kojo')).toBeUndefined();
      await Promise.resolve(); // deferred read — see findPatient
      expect(repository.recordState('patient-kojo').status).toBe('loading');
      // That second findPatient re-requested, nothing having been cached. Flushed so verify() passes.
      httpMock.expectOne(request => request.url.endsWith('services/professionalservice/api/patients/patient-kojo')).flush(null);
    });

    /** One record response, with a chosen set of headers on it. */
    const flushRecord = (id: string, headers: Record<string, string> = {}): void => {
      httpMock
        .expectOne(request => request.url.endsWith(`services/professionalservice/api/patients/${id}`))
        .flush(
          {
            id,
            patientName: 'Kojo Ampia-Addison',
            lastActivityAt: null,
            sex: 'male',
            isChild: false,
            dateOfBirth: '1976-04-19',
            phone: '0242286304',
            email: 'kojo@jac.net',
            cases: [],
            visitations: [],
            activities: [],
            medications: [],
            reports: [],
          },
          { headers },
        );
    };
  });

  it('optimistically applies updateCase and PATCHes the clinical-case fields', () => {
    flushInitialLoad();

    const updated = repository.updateCase('case-1', { status: 'closed', diagnosis: 'Resolved' });

    expect(updated).toMatchObject({ id: 'case-1', status: 'closed', diagnosis: 'Resolved' });
    expect(repository.caseCounts()).toEqual({ urgent: 0, open: 0, treatment: 0, closed: 1 });

    const req = httpMock.expectOne(request => request.url.endsWith('services/patientservice/api/clinical-cases/case-1'));
    expect(req.request.method).toBe('PATCH');
    // status goes to the wire in the generated enum's upper case; diagnosis is a real field now.
    expect(req.request.body).toMatchObject({ status: 'CLOSED', diagnosis: 'Resolved' });
    req.flush({ id: 'case-1', status: 'CLOSED', diagnosis: 'Resolved' });
  });

  // ---------------------------------------------------------------- item 203
  //
  // The collection read sends no page and no size, so the server answers with its own default.
  // Measured on quality 2026-09-25: 20 rows of 1167, and 8 of the signed-in clinician's 105 cases.
  // A case outside that sample used to render "This case was not found." — about a real case, to the
  // clinician it belongs to. These three cases pin the read that replaced that inference.

  it('reads a case the collection never returned, rather than calling it absent', async () => {
    flushInitialLoad();

    // case-1 is in the collection; this id is not — exactly the 97-of-105 population.
    expect(repository.findCase('case-beyond-the-page')).toBeUndefined();

    // The read is deferred out of the caller's reactive context (NG0600 — see the repository), so it
    // exists after a microtask rather than synchronously. Awaiting it here is the timing the app has.
    await Promise.resolve();
    const req = httpMock.expectOne(r => r.url.endsWith('services/patientservice/api/clinical-cases/case-beyond-the-page'));
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'case-beyond-the-page', symptoms: 'Cough', patientId: 'patient-kojo', status: 'open', brief: 'Beyond page 0' });

    expect(repository.findCase('case-beyond-the-page')?.id).toBe('case-beyond-the-page');
    expect(repository.caseReadState('case-beyond-the-page').status).toBe('ready');
  });

  it('treats a 404 as ready-and-absent, so absence is the server answering rather than a cache miss', async () => {
    flushInitialLoad();

    expect(repository.findCase('no-such-case')).toBeUndefined();
    await Promise.resolve();
    httpMock
      .expectOne(r => r.url.endsWith('services/patientservice/api/clinical-cases/no-such-case'))
      .flush({ detail: 'Not found' }, { status: 404, statusText: 'Not Found' });

    // `ready`, not `error`: the read succeeded in telling us there is nothing. A refusal or an
    // outage must NOT arrive here as absence, which the next case pins.
    expect(repository.caseReadState('no-such-case').status).toBe('ready');
  });

  it('findPatient can be called from inside a computed too (NG0600)', async () => {
    flushInitialLoad();

    // The same shape as the case below, and the reason it is a separate case: findPatient is reached
    // from TWO computeds — `patient` on the record page and `parentName` on the case detail page.
    // It has been throwing NG0600 on a cold render since before item 203 (measured on quality: two per
    // cold case-detail load, silent because Angular recovers and the page still paints). Item 203 made
    // it visible rather than introducing it — a case beyond the collection read now RESOLVES, so
    // parentName reaches an uncached patient and the throw lands mid-render.
    const viaComputed = computed(() => repository.findPatient('patient-read-from-a-computed'));

    expect(() => viaComputed()).not.toThrow();

    await Promise.resolve();
    httpMock.expectOne(r => r.url.endsWith('services/professionalservice/api/patients/patient-read-from-a-computed'));
  });

  it('can be called from inside a computed without writing a signal there (NG0600)', () => {
    flushInitialLoad();

    // THE SHAPE THE APP ACTUALLY USES, and the one the other cases here miss. Every test around this
    // calls findCase directly; `case-detail-page.component.ts` calls it from a `computed`, and Angular
    // throws NG0600 — "Writing to signals is not allowed in a computed" — if the read it starts sets
    // one during the computation.
    //
    // Item 203's first version did exactly that. Every unit test passed, CI passed, and the case
    // detail page rendered nothing at all on quality: no case, no state arm, no not-found. It had to
    // be rolled back. This case is what would have caught it.
    const viaComputed = computed(() => repository.findCase('case-read-from-a-computed'));

    expect(() => viaComputed()).not.toThrow();

    // And the read still happens — deferring it must not mean skipping it. The microtask that carries
    // it out of the computation has to run before the request exists, so flush it first.
    return Promise.resolve().then(() => {
      httpMock.expectOne(r => r.url.endsWith('services/patientservice/api/clinical-cases/case-read-from-a-computed'));
    });
  });

  it('does not re-request a case while its read is in flight', async () => {
    flushInitialLoad();

    repository.findCase('case-inflight');
    repository.findCase('case-inflight');
    repository.findCase('case-inflight');
    await Promise.resolve();

    // One request, not three. Without the guard every change-detection pass starts another, and a
    // case that 404s would loop on the network for as long as the page is open.
    httpMock.expectOne(r => r.url.endsWith('services/patientservice/api/clinical-cases/case-inflight'));
  });
});
