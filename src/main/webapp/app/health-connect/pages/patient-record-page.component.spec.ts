import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';

import { FakeHealthConnectRepository } from '../testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import { RestrictedPart } from '../api/restricted-parts';
import PatientRecordPageComponent from './patient-record-page.component';

describe('PatientRecordPageComponent', () => {
  let component: PatientRecordPageComponent;
  let fixture: ComponentFixture<PatientRecordPageComponent>;
  const authenticationState = new BehaviorSubject({
    activated: true,
    authorities: ['ROLE_DOCTOR'],
    email: 'doctor@example.test',
    firstName: null,
    langKey: 'en',
    lastName: null,
    login: 'doctor',
    imageUrl: null,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientRecordPageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository },
        {
          provide: ActivatedRoute,
          useValue: { parent: { snapshot: { paramMap: convertToParamMap({ patientId: 'patient-kojo' }) } } },
        },
        { provide: Router, useValue: { navigate: jest.fn(() => Promise.resolve(true)) } },
        { provide: AccountService, useValue: { getAuthenticationState: () => authenticationState.asObservable() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PatientRecordPageComponent);
    component = fixture.componentInstance;
    TestBed.inject(FakeHealthConnectRepository).reset();
    fixture.detectChanges();
  });

  it('uses labelled clinical panels and a focusable activity dialog trigger', () => {
    const panelHeadings = fixture.nativeElement.querySelectorAll('.hpd-panel h2');
    const trigger = fixture.nativeElement.querySelector('[aria-haspopup="dialog"]') as HTMLButtonElement;

    expect(panelHeadings).toHaveLength(5);
    expect(trigger).not.toBeNull();
    expect(trigger.classList).toContain('hpd-focusable');
    expect(fixture.nativeElement.querySelector('.hpd-record-grid')).not.toBeNull();
  });

  describe('X-Restricted-Parts on the record (backlog item 126)', () => {
    // The defect: `api/` serves a pharmacist this record without its activity log and names that in
    // the response header. Unread, the activity panel renders an empty list and "No records found."
    // — which is indistinguishable from a patient nobody has touched, on a screen a clinician reads
    // while deciding what to do next.
    //
    // `data-cy` rather than text, because these specs run against an empty TranslateModule and
    // because the treatment must be identifiable by more than the words in it.
    const notice = (): Element | null => fixture.nativeElement.querySelector('[data-cy="recordRestrictedLastActivity"]');
    const activityPanel = (): Element => fixture.nativeElement.querySelectorAll('.hpd-panel')[2];

    it('says nothing at all when the response carried no header', () => {
      // Five of the eight disciplines are refused nothing and must see the screen they always saw.
      expect(notice()).toBeNull();
      expect(component.restricted('lastActivity')).toBe(false);
      expect(activityPanel().querySelectorAll('li')).toHaveLength(1);
    });

    it('replaces the activity entries with a sentence when the activity log was withheld', () => {
      restrict('lastActivity');

      expect(notice()).not.toBeNull();
      expect(notice()?.querySelector('span')?.textContent?.trim()).toBe('healthConnect.patient.recordRestricted.lastActivity');
      // In place of the list, not above it. Every entry is withheld, so an empty list and its
      // paginator left underneath would go on printing the false sentence beside the true one —
      // and the fixture patient does have an entry, so a list here would be doubly wrong.
      expect(activityPanel().querySelectorAll('li')).toHaveLength(0);
      expect(activityPanel().querySelector('hpd-pagination')).toBeNull();
    });

    it('leaves every other panel alone', () => {
      // Only the activity log is withheld. Emptying the record wholesale would be a second false
      // statement replacing the first, and `api/` refuses the whole record when more than this one
      // collection is unreadable rather than serving a hollowed-out one.
      restrict('lastActivity');

      expect(fixture.nativeElement.querySelectorAll('.hpd-panel')).toHaveLength(5);
      expect(fixture.nativeElement.querySelectorAll('[data-cy^="recordRestricted"]')).toHaveLength(1);
      expect(fixture.nativeElement.textContent).toContain('Severe pain due to a fall.');
    });

    it('ignores a token that cannot reach this endpoint, and one it does not know at all', () => {
      // `caseAssignments` never arrives here — a record whose case read was refused is not served
      // at all — and `api/` may name a third part on a release this bundle predates. Neither may
      // render: not the token, not a missing catalogue key, not the record screen's one sentence
      // under someone else's name.
      // The unknown token is spelled to collide with nothing already on this screen: the record
      // renders `healthConnect.patient.medications` untranslated in these specs, so asserting the
      // absence of "medications" would fail on a panel heading rather than on the defect.
      restrict('caseAssignments', 'vitalSigns' as RestrictedPart);

      expect(notice()).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('[data-cy^="recordRestricted"]')).toHaveLength(0);
      expect(fixture.nativeElement.textContent).not.toContain('caseAssignments');
      expect(fixture.nativeElement.textContent).not.toContain('vitalSigns');
    });

    it('reads the restriction for the patient on screen, not for whichever record was read last', () => {
      TestBed.inject(FakeHealthConnectRepository).setRecordRestrictions('patient-kwabena', ['lastActivity']);
      fixture.detectChanges();

      expect(notice()).toBeNull();
      expect(component.restricted('lastActivity')).toBe(false);
    });

    it('does not reuse the directory’s sentence', () => {
      // Item 129's copy trap, held at the point of use as well as in the catalogues. On the list
      // `lastActivity` blanks a column; here it withholds the patient's whole activity history, and
      // the list's wording would tell a pharmacist that recency sorting is unavailable.
      restrict('lastActivity');

      const rendered = notice()?.querySelector('span')?.textContent?.trim();

      expect(rendered).not.toBe('healthConnect.patient.restricted.lastActivity');
      expect(rendered).not.toBe('healthConnect.patient.restricted.lastActivityCell');
    });

    const restrict = (...parts: RestrictedPart[]): void => {
      TestBed.inject(FakeHealthConnectRepository).setRecordRestrictions('patient-kojo', parts);
      fixture.detectChanges();
    };
  });

  describe('why there is no record (backlog item 146)', () => {
    // `findPatient`'s two failure handlers wrote the repository's single shared error signal — which
    // THIS page never read — so their whole visible effect was to blank the directory, the dashboard
    // and the case queue, while the one screen actually waiting on that read said "no records found"
    // about a response that had been refused or had 503'd. Both halves were wrong.
    const sentence = (): string | undefined => fixture.nativeElement.textContent?.trim();
    const repository = (): FakeHealthConnectRepository => TestBed.inject(FakeHealthConnectRepository);

    beforeEach(() => {
      // The fake serves a record unless the directory read said this follow-up will refuse, which is
      // the only way to reach the branch under test.
      repository().setDirectoryRestrictedFollowUps(['record']);
    });

    it('says the read was REFUSED, not that the patient has nothing', () => {
      repository().setRecordState('patient-kojo', { status: 'forbidden', error: 'healthConnect.states.forbidden' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-cy="recordForbidden"]')).not.toBeNull();
      expect(sentence()).toContain('healthConnect.states.forbidden');
      expect(sentence()).not.toContain('healthConnect.states.empty');
    });

    it('says the read FAILED when it failed, which is a different sentence again', () => {
      repository().setRecordState('patient-kojo', { status: 'error', error: 'healthConnect.states.error' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-cy="recordFailed"]')).not.toBeNull();
      expect(sentence()).toContain('healthConnect.states.error');
    });

    it('still says "no records found" for a read that succeeded and found nothing', () => {
      // The positive control, and why the empty sentence stays the default: it is the right one for
      // a patient with nothing recorded, and the wrong one for every other reason there is no record.
      repository().setRecordState('patient-kojo', { status: 'ready', error: null });
      fixture.detectChanges();

      expect(sentence()).toContain('healthConnect.states.empty');
      expect(fixture.nativeElement.querySelector('[data-cy="recordForbidden"]')).toBeNull();
    });
  });

  it('blocks report mutations for a read-only role, including direct method invocation', () => {
    authenticationState.next({ ...authenticationState.value, authorities: ['ROLE_USER'] });
    fixture.detectChanges();

    component.upload([new File(['report'], 'report.pdf', { type: 'application/pdf' })]);

    expect(component.canManageReports()).toBe(false);
    expect(fixture.nativeElement.querySelector('hpd-file-upload-trigger button').disabled).toBe(true);
    expect(TestBed.inject(FakeHealthConnectRepository).findPatient('patient-kojo')?.reports).toHaveLength(1);
  });
});
