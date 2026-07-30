import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { sampleWithRequiredData } from '../medication-record.test-samples';
import { MedicationRecordService } from '../service/medication-record.service';

import { MedicationRecordComponent } from './medication-record';

jest.useFakeTimers();

// SKIPPED: needs Angular 20's TestBed.tick() for httpResource-backed components.
// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.
describe.skip('MedicationRecord Management Component', () => {
  let httpMock: HttpTestingController;
  let comp: MedicationRecordComponent;
  let fixture: ComponentFixture<MedicationRecordComponent>;
  let service: MedicationRecordService;
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

    fixture = TestBed.createComponent(MedicationRecordComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(MedicationRecordService);
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
    req.flush([{ id: 'bcabc4b7-675f-4d12-b963-1a937080e486' }], {
      headers: { link: '<http://localhost/api/foo?page=1&size=20>; rel="next"' },
    });
    await Promise.resolve();

    // THEN
    expect(comp.isLoading()).toEqual(false);
    expect(comp.medicationRecords()[0]).toEqual(expect.objectContaining({ id: 'bcabc4b7-675f-4d12-b963-1a937080e486' }));
  });

  describe('trackId', () => {
    it('should forward to medicationRecordService', () => {
      const entity = { id: 'bcabc4b7-675f-4d12-b963-1a937080e486' };
      jest.spyOn(service, 'getMedicationRecordIdentifier');
      const id = comp.trackId(entity);
      expect(service.getMedicationRecordIdentifier).toHaveBeenCalledWith(entity);
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
    expect(service.medicationRecordsParams()).toMatchObject(expect.objectContaining({ sort: ['id,desc'] }));
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
