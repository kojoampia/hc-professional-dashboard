import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { StatService } from '../service/stat.service';
import { sampleWithRequiredData } from '../stat.test-samples';

import { StatComponent } from './stat';

jest.useFakeTimers();

// SKIPPED: needs the Angular 20 TestBed.tick() API for httpResource-backed components.
// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.
describe.skip('Stat Management Component', () => {
  let httpMock: HttpTestingController;
  let comp: StatComponent;
  let fixture: ComponentFixture<StatComponent>;
  let service: StatService;
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

    fixture = TestBed.createComponent(StatComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(StatService);
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
    req.flush([{ id: 'e1b57b21-907f-4aea-81a7-6357e9764b6e' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await Promise.resolve();

    // THEN
    expect(comp.isLoading()).toEqual(false);
    expect(comp.stats()[0]).toEqual(expect.objectContaining({ id: 'e1b57b21-907f-4aea-81a7-6357e9764b6e' }));
  });

  describe('trackId', () => {
    it('should forward to statService', () => {
      const entity = { id: 'e1b57b21-907f-4aea-81a7-6357e9764b6e' };
      jest.spyOn(service, 'getStatIdentifier');
      const id = comp.trackId(entity);
      expect(service.getStatIdentifier).toHaveBeenCalledWith(entity);
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
    expect(service.statsParams()).toMatchObject(expect.objectContaining({ sort: ['id,desc'] }));
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
