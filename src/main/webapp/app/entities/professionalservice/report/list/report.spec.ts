import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { sampleWithRequiredData } from '../report.test-samples';
import { ReportService } from '../service/report.service';

import { ReportComponent } from './report';

jest.useFakeTimers();

// SKIPPED: needs the Angular 20 TestBed.tick() API for httpResource-backed components.
// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.
describe.skip('Report Management Component', () => {
  let httpMock: HttpTestingController;
  let comp: ReportComponent;
  let fixture: ComponentFixture<ReportComponent>;
  let service: ReportService;
  let routerNavigateSpy: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), MatIconModule],
      providers: [provideHttpClient(), 
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

    fixture = TestBed.createComponent(ReportComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(ReportService);
    routerNavigateSpy = jest.spyOn(comp.router, 'navigate');
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    httpMock.verify();
  });

  it('should call load all on init', async () => {
    // WHEN
    TestBed.flushEffects();
    const req = httpMock.expectOne({ method: 'GET' });
    req.flush([{ id: 'e885ed53-a9f8-46c5-9db7-aa4b52344422' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await Promise.resolve();

    // THEN
    expect(comp.isLoading()).toEqual(false);
    expect(comp.reports()[0]).toEqual(expect.objectContaining({ id: 'e885ed53-a9f8-46c5-9db7-aa4b52344422' }));
  });

  describe('trackId', () => {
    it('should forward to reportService', () => {
      const entity = { id: 'e885ed53-a9f8-46c5-9db7-aa4b52344422' };
      jest.spyOn(service, 'getReportIdentifier');
      const id = comp.trackId(entity);
      expect(service.getReportIdentifier).toHaveBeenCalledWith(entity);
      expect(id).toBe(entity.id);
    });
  });

  it('should calculate the sort attribute for a non-id attribute', () => {
    // WHEN
    comp.navigateToWithComponentValues({ predicate: 'non-existing-column', ascending: true });

    // THEN
    expect(routerNavigateSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        queryParams: expect.objectContaining({
          sort: ['non-existing-column,asc', 'id'],
        }),
      }),
    );
  });

  it('should calculate the sort attribute for an id', () => {
    // WHEN
    TestBed.flushEffects();
    httpMock.expectOne({ method: 'GET' });

    // THEN
    expect(service.reportsParams()).toMatchObject(expect.objectContaining({ sort: ['id,desc'] }));
  });

  describe('delete', () => {
    let dialog: MatDialog;
    let deleteModalMock: any;

    beforeEach(() => {
      deleteModalMock = { componentInstance: {}, closed: new Subject() };
      // NgbModal is not a singleton using TestBed.inject.
      // dialog = TestBed.inject(MatDialog);
      dialog = (comp as any).dialog;
      jest.spyOn(dialog, 'open').mockReturnValue(deleteModalMock);
    });

    it('on confirm should call load', inject([], () => {
      // GIVEN
      jest.spyOn(comp, 'load');

      // WHEN
      comp.delete(sampleWithRequiredData);
      deleteModalMock.closed.next('deleted');

      // THEN
      expect(dialog.open).toHaveBeenCalled();
      expect(comp.load).toHaveBeenCalled();
    }));

    it('on dismiss should call load', inject([], () => {
      // GIVEN
      jest.spyOn(comp, 'load');

      // WHEN
      comp.delete(sampleWithRequiredData);
      deleteModalMock.closed.next();

      // THEN
      expect(dialog.open).toHaveBeenCalled();
      expect(comp.load).not.toHaveBeenCalled();
    }));
  });
});
