import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IMedication } from '../medication.model';
import { MedicationService } from '../service/medication.service';

import { MedicationFormService } from './medication-form.service';
import { MedicationUpdate } from './medication-update';

describe('Medication Management Update Component', () => {
  let comp: MedicationUpdate;
  let fixture: ComponentFixture<MedicationUpdate>;
  let activatedRoute: ActivatedRoute;
  let medicationFormService: MedicationFormService;
  let medicationService: MedicationService;

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

    fixture = TestBed.createComponent(MedicationUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    medicationFormService = TestBed.inject(MedicationFormService);
    medicationService = TestBed.inject(MedicationService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const medication: IMedication = { id: 'f8ed80ef-a642-41e1-b2de-93a365ad06be' };

      activatedRoute.data = of({ medication });
      comp.ngOnInit();

      expect(comp.medication).toEqual(medication);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IMedication>();
      const medication = { id: 'cefe9515-9d76-403f-afa9-35f0d986275b' };
      vitest.spyOn(medicationFormService, 'getMedication').mockReturnValue(medication);
      vitest.spyOn(medicationService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medication });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(medication);
      saveSubject.complete();

      // THEN
      expect(medicationFormService.getMedication).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(medicationService.update).toHaveBeenCalledWith(expect.objectContaining(medication));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IMedication>();
      const medication = { id: 'cefe9515-9d76-403f-afa9-35f0d986275b' };
      vitest.spyOn(medicationFormService, 'getMedication').mockReturnValue({ id: null });
      vitest.spyOn(medicationService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medication: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(medication);
      saveSubject.complete();

      // THEN
      expect(medicationFormService.getMedication).toHaveBeenCalled();
      expect(medicationService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IMedication>();
      const medication = { id: 'cefe9515-9d76-403f-afa9-35f0d986275b' };
      vitest.spyOn(medicationService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medication });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(medicationService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
