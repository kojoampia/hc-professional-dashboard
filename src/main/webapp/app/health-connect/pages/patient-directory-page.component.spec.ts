import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { FakeHealthConnectRepository } from '../testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from '../health-connect.repository';
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
    const column = component.columns.find(candidate => candidate.id === 'activity');

    expect(column?.value({ id: 'p1', patientName: 'Never Seen', sex: 'female', isChild: false, lastActivityAt: null })).toBe('—');
  });

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
