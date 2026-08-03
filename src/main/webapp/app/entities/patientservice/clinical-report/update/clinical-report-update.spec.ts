import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IClinicalReport } from '../clinical-report.model';
import { ClinicalReportService } from '../service/clinical-report.service';

import { ClinicalReportFormService } from './clinical-report-form.service';
import { ClinicalReportUpdateComponent } from './clinical-report-update';

describe('ClinicalReport Management Update Component', () => {
  let comp: ClinicalReportUpdateComponent;
  let fixture: ComponentFixture<ClinicalReportUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let clinicalReportFormService: ClinicalReportFormService;
  let clinicalReportService: ClinicalReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), MatIconModule],
      providers: [provideHttpClient(), 
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: from([{}]),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ClinicalReportUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    clinicalReportFormService = TestBed.inject(ClinicalReportFormService);
    clinicalReportService = TestBed.inject(ClinicalReportService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const clinicalReport: IClinicalReport = { id: '9d4161be-422f-42c5-ac62-beacb6a29ddf' };

      activatedRoute.data = of({ clinicalReport });
      comp.ngOnInit();

      expect(comp.clinicalReport).toEqual(clinicalReport);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IClinicalReport>();
      const clinicalReport = { id: '01933c67-ade2-4ab5-a4bb-6f68a83c4787' };
      jest.spyOn(clinicalReportFormService, 'getClinicalReport').mockReturnValue(clinicalReport);
      jest.spyOn(clinicalReportService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ clinicalReport });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(clinicalReport);
      saveSubject.complete();

      // THEN
      expect(clinicalReportFormService.getClinicalReport).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(clinicalReportService.update).toHaveBeenCalledWith(expect.objectContaining(clinicalReport));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IClinicalReport>();
      const clinicalReport = { id: '01933c67-ade2-4ab5-a4bb-6f68a83c4787' };
      jest.spyOn(clinicalReportFormService, 'getClinicalReport').mockReturnValue({ id: null });
      jest.spyOn(clinicalReportService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ clinicalReport: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(clinicalReport);
      saveSubject.complete();

      // THEN
      expect(clinicalReportFormService.getClinicalReport).toHaveBeenCalled();
      expect(clinicalReportService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IClinicalReport>();
      const clinicalReport = { id: '01933c67-ade2-4ab5-a4bb-6f68a83c4787' };
      jest.spyOn(clinicalReportService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ clinicalReport });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(clinicalReportService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
