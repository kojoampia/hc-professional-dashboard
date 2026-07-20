import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IMedCase } from '../med-case.model';
import { MedCaseService } from '../service/med-case.service';

import { MedCaseFormService } from './med-case-form.service';
import { MedCaseUpdate } from './med-case-update';

describe('MedCase Management Update Component', () => {
  let comp: MedCaseUpdate;
  let fixture: ComponentFixture<MedCaseUpdate>;
  let activatedRoute: ActivatedRoute;
  let medCaseFormService: MedCaseFormService;
  let medCaseService: MedCaseService;

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

    fixture = TestBed.createComponent(MedCaseUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    medCaseFormService = TestBed.inject(MedCaseFormService);
    medCaseService = TestBed.inject(MedCaseService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const medCase: IMedCase = { id: '26c32ccf-3c7c-40ba-92db-700b8a3158a6' };

      activatedRoute.data = of({ medCase });
      comp.ngOnInit();

      expect(comp.medCase).toEqual(medCase);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IMedCase>();
      const medCase = { id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' };
      vitest.spyOn(medCaseFormService, 'getMedCase').mockReturnValue(medCase);
      vitest.spyOn(medCaseService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medCase });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(medCase);
      saveSubject.complete();

      // THEN
      expect(medCaseFormService.getMedCase).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(medCaseService.update).toHaveBeenCalledWith(expect.objectContaining(medCase));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IMedCase>();
      const medCase = { id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' };
      vitest.spyOn(medCaseFormService, 'getMedCase').mockReturnValue({ id: null });
      vitest.spyOn(medCaseService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medCase: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(medCase);
      saveSubject.complete();

      // THEN
      expect(medCaseFormService.getMedCase).toHaveBeenCalled();
      expect(medCaseService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IMedCase>();
      const medCase = { id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' };
      vitest.spyOn(medCaseService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medCase });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(medCaseService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
