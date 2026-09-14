import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
    // used to call `this.error.set(...)`, and `this.error` is what asyncState.status reads to choose
    // between the list and "Unable to load this information" — so one failed write replaced the
    // whole case queue with an error panel, Retry re-ran the load and never cleared the signal, and
    // only a full page reload brought the list back.
    //
    // A LOAD failure blanking the collection is right: there is nothing to show. A WRITE failure is
    // not: the data on screen is still there and still correct.
    // flushInitialLoad puts case-1 in the queue; without a real case archiveCase returns at its
    // guard and the test passes while exercising nothing.
    flushInitialLoad();
    expect(repository.asyncState().status).not.toBe('error');

    expect(repository.archiveCase('case-1', 'a reason')).toBe(true);
    httpMock
      .match(request => request.url.includes('archive'))
      .forEach(request => request.flush({ message: 'denied' }, { status: 403, statusText: 'Forbidden' }));

    expect(repository.asyncState().status).not.toBe('error');
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

    it('clears the restrictions when the directory read fails outright', () => {
      // The rows are gone and the error panel replaces them, so a surviving "part of this list was
      // withheld" would be a statement about a list that is no longer on screen.
      flushDirectory({ 'X-Restricted-Parts': 'lastActivity' });
      expect(repository.directoryRestrictions()).toEqual(['lastActivity']);

      repository.reset();
      flushRestOfLoad();
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients'))
        .flush('nope', { status: 503, statusText: 'Service Unavailable' });

      expect(repository.asyncState().status).toBe('error');
      expect(repository.directoryRestrictions()).toEqual([]);
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

  it('lazily fetches a patient record on findPatient and populates it once the response lands', () => {
    flushInitialLoad();

    expect(repository.findPatient('patient-kojo')).toBeUndefined();

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

    it('reports nothing restricted when the record response carried no header', () => {
      flushInitialLoad();
      expect(repository.findPatient('patient-kojo')).toBeUndefined();
      flushRecord('patient-kojo');

      expect(repository.recordRestrictions('patient-kojo')).toEqual([]);
    });

    it('reports the part a pharmacist was refused on this record', () => {
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      flushRecord('patient-kojo', { 'X-Restricted-Parts': 'lastActivity' });

      expect(repository.recordRestrictions('patient-kojo')).toEqual(['lastActivity']);
      // The record itself still arrives — the whole point of item 112 is that it is served rather
      // than 503'd, with one collection missing from it.
      expect(repository.findPatient('patient-kojo')?.patient.patientName).toBe('Kojo Ampia-Addison');
    });

    it('drops a token it does not know rather than passing it to the screen', () => {
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      flushRecord('patient-kojo', { 'X-Restricted-Parts': 'medications,lastActivity' });

      expect(repository.recordRestrictions('patient-kojo')).toEqual(['lastActivity']);
    });

    it('keeps each record’s restriction with that record, not with the last read', () => {
      // The reason this is a map and not a single signal. Records are cached and a clinician moves
      // between them, so one value would describe the newest response while an older record is on
      // screen — and "you may not read this patient's activity log" would be printed against a
      // patient nobody asked about.
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      flushRecord('patient-kojo', { 'X-Restricted-Parts': 'lastActivity' });
      repository.findPatient('patient-ama');
      flushRecord('patient-ama');

      expect(repository.recordRestrictions('patient-kojo')).toEqual(['lastActivity']);
      expect(repository.recordRestrictions('patient-ama')).toEqual([]);
    });

    it('reports nothing for a patient whose record was never fetched', () => {
      flushInitialLoad();

      expect(repository.recordRestrictions('patient-never-asked-for')).toEqual([]);
    });

    it('leaves no restriction behind when the record is dropped and the re-read fails', () => {
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
      flushRecord('patient-kojo', { 'X-Restricted-Parts': 'lastActivity' });
      expect(repository.recordRestrictions('patient-kojo')).toEqual(['lastActivity']);

      repository.reset();
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      httpMock
        .expectOne(request => request.url.endsWith('services/professionalservice/api/patients/patient-kojo'))
        .flush('nope', { status: 503, statusText: 'Service Unavailable' });

      expect(repository.asyncState().status).toBe('error');
      expect(repository.recordRestrictions('patient-kojo')).toEqual([]);
    });

    it('does not manufacture an empty record from a 200 with no body', () => {
      // An empty `activities` array conjured out of a broken response is exactly the screen this
      // item exists to remove, arriving from the other direction — nothing withheld and nothing
      // recorded, said by the client rather than by the server.
      flushInitialLoad();
      repository.findPatient('patient-kojo');
      httpMock.expectOne(request => request.url.endsWith('services/professionalservice/api/patients/patient-kojo')).flush(null);

      expect(repository.findPatient('patient-kojo')).toBeUndefined();
      expect(repository.asyncState().status).toBe('error');
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
});
