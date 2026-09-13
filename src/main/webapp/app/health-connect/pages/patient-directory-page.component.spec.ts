import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { FakeHealthConnectRepository } from '../testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
import { RestrictedPart } from '../api/restricted-parts';
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
