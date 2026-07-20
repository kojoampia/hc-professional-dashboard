import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { MockHealthConnectRepository } from '../health-connect.repository';
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
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PatientDirectoryPageComponent);
    component = fixture.componentInstance;
    TestBed.inject(MockHealthConnectRepository).reset();
    fixture.detectChanges();
    router.navigate.mockClear();
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
    expect(router.navigate).toHaveBeenLastCalledWith(['/patients', 'patient-ama']);
  }));
});
