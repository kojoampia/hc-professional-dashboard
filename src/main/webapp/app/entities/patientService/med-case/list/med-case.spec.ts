import { MockInstance, afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faEye, faPencilAlt, faPlus, faSort, faSortDown, faSortUp, faSync, faTimes } from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { sampleWithRequiredData } from '../med-case.test-samples';
import { MedCaseService } from '../service/med-case.service';

import { MedCase } from './med-case';

vitest.useFakeTimers();

describe('MedCase Management Component', () => {
  let httpMock: HttpTestingController;
  let comp: MedCase;
  let fixture: ComponentFixture<MedCase>;
  let service: MedCaseService;
  let routerNavigateSpy: MockInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              defaultSort: 'id,asc',
            }),
            queryParamMap: of(
              convertToParamMap({
                page: '1',
                size: '1',
                sort: 'id,desc',
              }),
            ),
            snapshot: {
              queryParams: {},
              queryParamMap: convertToParamMap({
                page: '1',
                size: '1',
                sort: 'id,desc',
              }),
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(MedCase);
    comp = fixture.componentInstance;
    service = TestBed.inject(MedCaseService);
    routerNavigateSpy = vitest.spyOn(comp.router, 'navigate');

    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faEye, faPencilAlt, faPlus, faSort, faSortDown, faSortUp, faSync, faTimes);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    httpMock.verify();
  });

  it('should call load all on init', async () => {
    // WHEN
    TestBed.tick();
    const req = httpMock.expectOne({ method: 'GET' });
    req.flush([{ id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();

    // THEN
    expect(comp.isLoading()).toEqual(false);
    expect(comp.medCases()[0]).toEqual(expect.objectContaining({ id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' }));
  });

  describe('trackId', () => {
    it('should forward to medCaseService', () => {
      const entity = { id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' };
      vitest.spyOn(service, 'getMedCaseIdentifier');
      const id = comp.trackId(entity);
      expect(service.getMedCaseIdentifier).toHaveBeenCalledWith(entity);
      expect(id).toBe(entity.id);
    });
  });

  it('should calculate the sort attribute for a non-id attribute', () => {
    // WHEN
    comp.navigateToWithComponentValues({ predicate: 'non-existing-column', order: 'asc' });

    // THEN
    expect(routerNavigateSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        queryParams: expect.objectContaining({
          sort: ['non-existing-column,asc'],
        }),
      }),
    );
  });

  it('should calculate the sort attribute for an id', () => {
    // WHEN
    TestBed.tick();
    httpMock.expectOne({ method: 'GET' });

    // THEN
    expect(service.medCasesParams()).toMatchObject(expect.objectContaining({ sort: ['id,desc'] }));
  });

  it('should infinite scroll', async () => {
    // GIVEN
    TestBed.tick();
    let req = httpMock.expectOne({ method: 'GET' });
    req.flush([{ id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();
    expect(comp.medCases().length).toEqual(1);
    expect(comp.medCases()[0]).toEqual(expect.objectContaining({ id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' }));

    // WHEN
    comp.loadNextPage();
    TestBed.tick();
    expect(service.medCasesParams()).toMatchObject(expect.objectContaining({ page: '1' }));
    req = httpMock.expectOne({ method: 'GET' });
    req.flush([{ id: '26c32ccf-3c7c-40ba-92db-700b8a3158a6' }], {
      headers: { link: '<http://localhost/api/foo?page=0&size=20>; rel="prev",<http://localhost/api/foo?page=2&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();
    expect(comp.medCases().length).toEqual(2);
    expect(comp.medCases()[1]).toEqual(expect.objectContaining({ id: '26c32ccf-3c7c-40ba-92db-700b8a3158a6' }));

    comp.loadNextPage();
    TestBed.tick();
    expect(service.medCasesParams()).toMatchObject(expect.objectContaining({ page: '2' }));
    req = httpMock.expectOne({ method: 'GET' });
    req.flush([{ id: '26c32ccf-3c7c-40ba-92db-700b8a3158a6' }], {
      headers: { link: '<http://localhost/api/foo?page=0&size=20>; rel="prev",<http://localhost/api/foo?page=2&size=20>; rel="next"' },
    });
    await vitest.runAllTimersAsync();
    expect(comp.medCases().length).toEqual(2);
    expect(comp.medCases()[1]).toEqual(expect.objectContaining({ id: '26c32ccf-3c7c-40ba-92db-700b8a3158a6' }));
  });

  describe('delete', () => {
    let ngbModal: NgbModal;
    let deleteModalMock: any;

    beforeEach(() => {
      deleteModalMock = { componentInstance: {}, closed: new Subject() };
      // NgbModal is not a singleton using TestBed.inject.
      // ngbModal = TestBed.inject(NgbModal);
      ngbModal = (comp as any).modalService;
      vitest.spyOn(ngbModal, 'open').mockReturnValue(deleteModalMock);
    });

    it('on confirm should call load', inject([], () => {
      // GIVEN
      vitest.spyOn(comp, 'load');

      // WHEN
      comp.delete(sampleWithRequiredData);
      deleteModalMock.closed.next('deleted');

      // THEN
      expect(ngbModal.open).toHaveBeenCalled();
      expect(comp.load).toHaveBeenCalled();
    }));

    it('on dismiss should call load', inject([], () => {
      // GIVEN
      vitest.spyOn(comp, 'load');

      // WHEN
      comp.delete(sampleWithRequiredData);
      deleteModalMock.closed.next();

      // THEN
      expect(ngbModal.open).toHaveBeenCalled();
      expect(comp.load).not.toHaveBeenCalled();
    }));
  });
});
