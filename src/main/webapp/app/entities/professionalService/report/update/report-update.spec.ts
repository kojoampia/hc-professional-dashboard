import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IReport } from '../report.model';
import { ReportService } from '../service/report.service';

import { ReportFormService } from './report-form.service';
import { ReportUpdate } from './report-update';

describe('Report Management Update Component', () => {
  let comp: ReportUpdate;
  let fixture: ComponentFixture<ReportUpdate>;
  let activatedRoute: ActivatedRoute;
  let reportFormService: ReportFormService;
  let reportService: ReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: from([{}]),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ReportUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    reportFormService = TestBed.inject(ReportFormService);
    reportService = TestBed.inject(ReportService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const report: IReport = { id: '4dddf5e7-444e-42ae-bf41-a8a5c3c01676' };

      activatedRoute.data = of({ report });
      comp.ngOnInit();

      expect(comp.report).toEqual(report);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IReport>();
      const report = { id: 'e885ed53-a9f8-46c5-9db7-aa4b52344422' };
      vitest.spyOn(reportFormService, 'getReport').mockReturnValue(report);
      vitest.spyOn(reportService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ report });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(report);
      saveSubject.complete();

      // THEN
      expect(reportFormService.getReport).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(reportService.update).toHaveBeenCalledWith(expect.objectContaining(report));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IReport>();
      const report = { id: 'e885ed53-a9f8-46c5-9db7-aa4b52344422' };
      vitest.spyOn(reportFormService, 'getReport').mockReturnValue({ id: null });
      vitest.spyOn(reportService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ report: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(report);
      saveSubject.complete();

      // THEN
      expect(reportFormService.getReport).toHaveBeenCalled();
      expect(reportService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IReport>();
      const report = { id: 'e885ed53-a9f8-46c5-9db7-aa4b52344422' };
      vitest.spyOn(reportService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ report });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(reportService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
