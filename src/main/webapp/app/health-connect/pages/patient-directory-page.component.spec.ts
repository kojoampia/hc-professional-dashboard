import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { FakeHealthConnectRepository } from '../testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import { RestrictedFollowUp, RestrictedPart } from '../api/restricted-parts';
import { PatientListRow } from '../health-connect.models';
import { DataTableColumn } from '../../shared/health-connect/data-table/data-table.component';
import SearchInputComponent from '../../shared/health-connect/form-controls/search-input.component';
import PatientDirectoryPageComponent from './patient-directory-page.component';

describe('PatientDirectoryPageComponent', () => {
  let component: PatientDirectoryPageComponent;
  let fixture: ComponentFixture<PatientDirectoryPageComponent>;
  let queryParamMap: BehaviorSubject<ParamMap>;
  const router = { navigate: jest.fn(() => Promise.resolve(true)) };
  const route = {
    get snapshot(): { queryParamMap: ParamMap } {
      return { queryParamMap: queryParamMap.value };
    },
    queryParamMap: undefined as unknown,
  };

  beforeEach(async () => {
    queryParamMap = new BehaviorSubject(convertToParamMap({ gender: 'female', q: 'ama', page: '1' }));
    route.queryParamMap = queryParamMap.asObservable();
    await TestBed.configureTestingModule({
      imports: [PatientDirectoryPageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PatientDirectoryPageComponent);
    component = fixture.componentInstance;
    TestBed.inject(FakeHealthConnectRepository).reset();
    fixture.detectChanges();
    router.navigate.mockClear();
  });

  it('renders a patient who has NEVER been seen, rather than dropping their row', () => {
    // `lastActivityAt` is null for a patient with no activity-log entries, and the column
    // dereferenced it unguarded. On the quality stack that threw once per never-seen patient and
    // rendered two rows out of nineteen — a caseload silently seventeen patients short.
    //
    // Nothing caught it because the model typed the field non-null, so TypeScript raised nothing,
    // and every fixture supplied a value, so the tests agreed with the wrong type instead of
    // checking it. Hence the explicit null below.
    const column = activityColumn();

    expect(column?.value({ id: 'p1', patientName: 'Never Seen', sex: 'female', isChild: false, lastActivityAt: null })).toBe('—');
  });

  describe('X-Restricted-Parts (backlog item 114)', () => {
    // The defect: a pharmacist is refused the activity log, every row's date comes back null, and
    // the column renders the same em dash a genuinely quiet caseload renders. "No activity" and
    // "not yours to see" are different sentences and the screen said the first.
    //
    // `data-cy` hooks rather than text, because the treatments must be told apart by more than the
    // words in them and because these specs run with an empty TranslateModule.
    const caseAssignmentsNotice = (): Element | null => fixture.nativeElement.querySelector('[data-cy="restrictedCaseAssignments"]');
    const lastActivityNotice = (): Element | null => fixture.nativeElement.querySelector('[data-cy="restrictedLastActivity"]');

    it('says nothing at all when the response carried no header', () => {
      // Five of the eight disciplines are refused nothing and must see the screen they always saw.
      // A treatment that fires on an unrestricted read would tell every clinician in the estate
      // that their caseload is short.
      expect(caseAssignmentsNotice()).toBeNull();
      expect(lastActivityNotice()).toBeNull();
      expect(component.restricted('lastActivity')).toBe(false);
      expect(activityColumn()?.value(rowSeenOn('2026-09-01'))).toBe('2026-09-01');
    });

    it('marks the recency column, and does NOT claim rows are missing, for lastActivity alone', () => {
      restrict('lastActivity');

      expect(lastActivityNotice()).not.toBeNull();
      // The pharmacist/chemist case. Every patient is listed; only the column was withheld — so
      // saying "patients are missing" here would be the same conflation pointing the other way.
      expect(caseAssignmentsNotice()).toBeNull();
      // Per row is honest for this part and only this part: the rows are all present and every one
      // of their dates is null, so no row's marker is a claim about a row that is not there.
      expect(activityColumn()?.value(rowSeenOn('2026-09-01'))).toBe('healthConnect.patient.restricted.lastActivityCell');
    });

    it('says rows are missing, distinctly, when both parts were refused', () => {
      // The technician case, measured on the quality stack: `caseAssignments,lastActivity`.
      restrict('caseAssignments', 'lastActivity');

      expect(caseAssignmentsNotice()).not.toBeNull();
      expect(lastActivityNotice()).not.toBeNull();
      // Two elements, two keys, two tints — not one banner listing both. A missing row and a blank
      // column cost different things and item 111's Decision A turns on exactly that asymmetry.
      // The `span`, not the whole element: a `mat-icon` renders its ligature name as text, and the
      // icon is part of what makes the two look unalike.
      expect(caseAssignmentsNotice()?.querySelector('span')?.textContent?.trim()).toBe('healthConnect.patient.restricted.caseAssignments');
      expect(lastActivityNotice()?.querySelector('span')?.textContent?.trim()).toBe('healthConnect.patient.restricted.lastActivity');
      expect(caseAssignmentsNotice()?.className).toContain('bg-hpd-warning-tint');
      expect(lastActivityNotice()?.className).not.toContain('bg-hpd-warning-tint');
    });

    it('leaves the recency column alone when only rows were withheld', () => {
      // `caseAssignments` alone is reachable: the service returns early on a caller with no
      // patients, before the activity log is read. The dates that did arrive are real, and marking
      // them "not permitted" would be a second false statement in place of the first.
      restrict('caseAssignments');

      expect(caseAssignmentsNotice()).not.toBeNull();
      expect(lastActivityNotice()).toBeNull();
      expect(activityColumn()?.value(rowSeenOn('2026-09-01'))).toBe('2026-09-01');
    });

    it('ignores a token it does not know while still treating the ones it does', () => {
      // The server may name a third part on a release this bundle predates. Nothing may render for
      // it — not the token, not a missing catalogue key.
      restrict('medications' as RestrictedPart, 'lastActivity');

      expect(lastActivityNotice()).not.toBeNull();
      expect(caseAssignmentsNotice()).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('medications');
      expect(fixture.nativeElement.querySelectorAll('[data-cy^="restricted"]')).toHaveLength(1);
    });

    const restrict = (...parts: RestrictedPart[]): void => {
      TestBed.inject(FakeHealthConnectRepository).setDirectoryRestrictions(parts);
      fixture.detectChanges();
    };

    const rowSeenOn = (lastActivityAt: string): PatientListRow => ({
      id: 'p1',
      patientName: 'Seen Recently',
      sex: 'female',
      isChild: false,
      lastActivityAt: `${lastActivityAt}T09:00:00Z`,
    });
  });

  describe('X-Restricted-Follow-Ups (backlog item 132)', () => {
    // The defect: `api/`'s item 128 emits the header, nothing read it, and a technician saw a
    // hundred tappable rows, tapped one and got a 503. Every row here is real and complete — this is
    // not a statement about the list, it is a statement about what acting on the list will do, which
    // is why it is neither of the two notices above and why it sits at the table rather than with
    // them at the top of the card.
    const followUpNotice = (): Element | null => fixture.nativeElement.querySelector('[data-cy="restrictedFollowUpRecord"]');
    const openButtons = (): NodeListOf<Element> => fixture.nativeElement.querySelectorAll('.hpd-data-table__actions button');

    it('says nothing, and offers the eye action, when the response carried no header', () => {
      // The positive control for everything below. If the rows had no action to begin with, every
      // "the action is withdrawn" assertion would pass against a table that never offered one.
      expect(followUpNotice()).toBeNull();
      expect(component.followUpRestricted('record')).toBe(false);
      expect(component.actions()).toEqual([expect.objectContaining({ id: 'view' })]);
      expect(openButtons().length).toBeGreaterThan(0);
    });

    it('tells the clinician the records will not open, and withdraws the link into them', () => {
      restrictFollowUps('record');

      expect(followUpNotice()?.querySelector('span')?.textContent?.trim()).toBe('healthConnect.patient.restrictedFollowUps.record');
      // Withdrawn rather than left to 503. A sentence saying the record will refuse, printed beside
      // a button that opens it, is a screen arguing with itself — and the button is the half the
      // clinician acts on. `api/` records the marker as never wrong when present, so nothing that
      // would have worked is being taken away; it is not a guard, and the record path refuses on its
      // own account whether or not this column is here.
      expect(component.actions()).toEqual([]);
      expect(openButtons()).toHaveLength(0);
    });

    it('leaves no dead target behind — nothing disabled, nothing focusable, no orphaned column', () => {
      // The accessibility half, and the reason withdrawing beats disabling here. A control that
      // looks interactive and is not costs a screen-reader user more than a sighted one: they reach
      // it, are told it is a button, and nothing happens. Absent, it is not announced at all, and
      // the sentence above the table carries the whole explanation.
      //
      // `mobile/` had to disable rather than remove because there the row itself is the control.
      // This table's rows are inert `<tr>`s, so there is nothing to leave behind — asserted rather
      // than assumed, because a later `isAvailable` refactor would reintroduce exactly the empty
      // action cell and orphaned header this checks for.
      restrictFollowUps('record');
      const table = fixture.nativeElement.querySelector('.hpd-data-table');

      expect(table.querySelectorAll('button, a, [tabindex], [aria-disabled], [disabled]')).toHaveLength(0);
      expect(table.querySelectorAll('.hpd-data-table__actions')).toHaveLength(0);
      // The header cell too: three columns and no fourth, so no column announces an action that is
      // not there. `<hpd-data-table>` renders it under the same `actions.length`.
      expect(table.querySelectorAll('thead th')).toHaveLength(component.columns().length);
    });

    it('STILL says it when another read fails and the table is replaced by an error panel', () => {
      // The blocking defect the first version of this shipped with, and the test that was missing
      // from BOTH repos.
      //
      // `loadAll` fires three requests sharing one error signal, and `patientservice` answers a
      // technician 403 on `clinical-cases` — their `ScopeOfPractice` grants OBSERVATION and IDENTITY
      // only, which item 111's Decision A already recorded as measured. So the directory read
      // succeeds and carries the header while `asyncState` is `error`, and `<hpd-async-state>`
      // projects its content in the final `@else` alone. With the notice inside it, the one
      // discipline the header is sent to was the one discipline that never saw the sentence: two
      // item-114 notices, then "Unable to load this information", and a Retry that re-issues the
      // same 403 for ever.
      //
      // The header is a fact about the read that SUCCEEDED. A different request failing does not
      // make these records openable — and the clinician needs the permanent explanation exactly when
      // the screen is otherwise offering them a transient one.
      restrictFollowUps('record');
      TestBed.inject(FakeHealthConnectRepository).setError('healthConnect.states.error');
      fixture.detectChanges();

      expect(component.repository.asyncState().status).toBe('error');
      expect(fixture.nativeElement.querySelector('.hpd-data-table')).toBeNull();
      expect(followUpNotice()).not.toBeNull();
    });

    it('does not blink out when a search empties the visible page, because it describes the caseload', () => {
      // Keyed on `patientRows()` — the whole cached caseload — rather than on the filtered page.
      // Keying on what survives the search box would make the sentence appear and vanish as the
      // clinician types, which is the instability item 128 refused when it declined to let the wire
      // value depend on caseload. A filter matching nothing does not make these records openable.
      //
      // The zero-row rule item 128 hands down is about a technician with no TASKS, and that case is
      // held by the caseAssignments test below, where the caseload itself is empty.
      restrictFollowUps('record');
      queryParamMap.next(convertToParamMap({ q: 'no-such-patient' }));
      fixture.detectChanges();

      expect(component.directoryPage().items).toEqual([]);
      expect(component.repository.patientRows().length).toBeGreaterThan(0);
      expect(followUpNotice()).not.toBeNull();
    });

    it('ignores a follow-up it does not know, leaving both the sentence and the action alone', () => {
      // `api/` may name a second follow-up on a release this bundle predates — it left the header
      // comma-separated for exactly that. Nothing may render for it, and nothing may be withdrawn
      // on account of it: taking the only way into a record away over a token this code cannot
      // explain is a worse failure than the one item 132 fixes.
      //
      // A NEGATIVE CONTROL, AND IT CANNOT REDDEN ON THE DROP ITSELF — labelled rather than left to
      // be mistaken for cover, which is item 126's lesson arriving one header along. This screen
      // asks `includes('record')`, and `['cases']` and `[]` answer that identically, so the test is
      // green whether the unknown token was dropped or carried the whole way here. Verified by
      // mutation: deleting the fake's filter leaves it passing.
      //
      // The drop IS proved, twice and elsewhere — `restricted-parts.spec.ts` on the parser and
      // `http-health-connect.repository.spec.ts` on the wire, both of which redden when
      // `parseRestrictedFollowUps` stops filtering. What this one is worth is the other half: that
      // an unrecognised token changes NOTHING on screen, neither printing a wire token nor
      // withdrawing the action. That part is real, and it is what the assertions below say.
      //
      // `mobile/` had to go further because it caches the parsed set across a cold start, so an
      // unparsed token there is written today and read back by a release that may have learned the
      // word. Nothing here is persisted — the signal lives in the tab and dies with it — so there is
      // no stored value to assert against.
      restrictFollowUps('cases' as RestrictedFollowUp);

      expect(followUpNotice()).toBeNull();
      expect(component.actions()).toEqual([expect.objectContaining({ id: 'view' })]);
      expect(fixture.nativeElement.textContent).not.toContain('cases');
    });

    it('reads unalike beside the notice about the list, when both arrive on one read', () => {
      // Two statements on one screen, and they must not read as one: this column is blank / acting
      // on the rows that are here will be refused. Two elements, two keys, two tints, and the
      // stronger tint is on the stronger claim — the other two say what cannot be seen, this one
      // says what cannot be done.
      restrict('lastActivity');
      restrictFollowUps('record');

      expect(fixture.nativeElement.querySelectorAll('[data-cy^="restricted"]')).toHaveLength(2);
      expect(followUpNotice()?.className).toContain('bg-hpd-danger-tint');
      expect(fixture.nativeElement.querySelector('[data-cy="restrictedLastActivity"]')?.className).not.toContain('bg-hpd-danger-tint');
    });

    it('stays silent under a caseAssignments refusal that leaves no rows, while that notice still speaks', () => {
      // The live technician is sent `caseAssignments,lastActivity` AND `record`, so all three would
      // be on screen at once on a real caseload of a hundred rows. On THIS fixture they cannot be:
      // every seeded record carries an assigned case, so the refusal empties the directory
      // altogether — a real response shape, and the narrower one the fake's own docstring flags.
      //
      // Which makes it THE exercise of the empty-page rule item 128 hands down, and a better one
      // than a search that matches nothing: the cause is a refusal rather than a filter, so the
      // caseload itself is empty and there are genuinely no rows to describe. The division of
      // labour is the point: the caseAssignments banner explains why there is nothing here, and
      // this sentence — which describes rows — correctly says nothing about none.
      restrict('caseAssignments');
      restrictFollowUps('record');

      expect(component.repository.patientRows()).toEqual([]);
      expect(component.directoryPage().items).toEqual([]);
      expect(fixture.nativeElement.querySelector('[data-cy="restrictedCaseAssignments"]')).not.toBeNull();
      expect(followUpNotice()).toBeNull();
    });

    const restrictFollowUps = (...followUps: RestrictedFollowUp[]): void => {
      TestBed.inject(FakeHealthConnectRepository).setDirectoryRestrictedFollowUps(followUps);
      fixture.detectChanges();
    };

    const restrict = (...parts: RestrictedPart[]): void => {
      TestBed.inject(FakeHealthConnectRepository).setDirectoryRestrictions(parts);
      fixture.detectChanges();
    };
  });

  const activityColumn = (): DataTableColumn<PatientListRow> | undefined =>
    component.columns().find(candidate => candidate.id === 'activity');

  it('restores direct URL filters and reacts to browser query-parameter changes', () => {
    expect(component.gender()).toBe('female');
    expect(component.query()).toBe('ama');
    expect(component.directoryPage().items).toEqual([expect.objectContaining({ id: 'patient-ama' })]);

    queryParamMap.next(convertToParamMap({ gender: 'male', q: 'kojo', page: '2' }));
    fixture.detectChanges();

    expect(component.gender()).toBe('male');
    expect(component.query()).toBe('kojo');
    expect(component.page()).toBe(2);
    expect(component.directoryPage().items).toEqual([expect.objectContaining({ id: 'patient-kojo' })]);
  });

  it('writes filter and pagination changes to URL query parameters', () => {
    component.setGender('male');
    queryParamMap.next(convertToParamMap({ gender: 'male', q: 'ama' }));
    fixture.detectChanges();
    component.setChildrenOnly(true);
    queryParamMap.next(convertToParamMap({ gender: 'male', q: 'ama', children: 'true' }));
    fixture.detectChanges();
    component.setPage(2);

    expect(router.navigate).toHaveBeenNthCalledWith(1, [], {
      relativeTo: route,
      queryParams: { q: 'ama', gender: 'male', children: null, page: null },
    });
    expect(router.navigate).toHaveBeenNthCalledWith(2, [], {
      relativeTo: route,
      queryParams: { q: 'ama', gender: 'male', children: 'true', page: null },
    });
    expect(router.navigate).toHaveBeenNthCalledWith(3, [], {
      relativeTo: route,
      queryParams: { q: 'ama', gender: 'male', children: 'true', page: 2 },
    });
  });

  it('debounces name searches for 300ms and routes the eye action to the patient record', fakeAsync(() => {
    fixture.debugElement.query(By.directive(SearchInputComponent)).componentInstance.onInput('kojo');
    tick(299);
    expect(router.navigate).not.toHaveBeenCalled();
    tick(1);
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { q: 'kojo', gender: 'female', children: null, page: null },
    });

    component.handleAction({ actionId: 'view', row: component.directoryPage().items[0] });
    // preserve: search text, gender, children-only and page all live in the query string, and the
    // directory stays mounted behind the record overlay.
    expect(router.navigate).toHaveBeenLastCalledWith(['/patients', 'patient-ama'], { queryParamsHandling: 'preserve' });
  }));
});
