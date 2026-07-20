import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, from } from 'rxjs';

import { MedicationService } from '../service/medication.service';
import { IMedication } from '../medication.model';
import { MedicationFormService } from './medication-form.service';

import { MedicationUpdateComponent } from './medication-update.component';

describe('Medication Management Update Component', () => {
  let comp: MedicationUpdateComponent;
  let fixture: ComponentFixture<MedicationUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let medicationFormService: MedicationFormService;
  let medicationService: MedicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [RouterTestingModule.withRoutes([]), MedicationUpdateComponent],
    providers: [
        FormBuilder,
        {
            provide: ActivatedRoute,
            useValue: {
                params: from([{}]),
            },
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
})
      .overrideTemplate(MedicationUpdateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(MedicationUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    medicationFormService = TestBed.inject(MedicationFormService);
    medicationService = TestBed.inject(MedicationService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('Should update editForm', () => {
      const medication: IMedication = { id: 'CBA' };

      activatedRoute.data = of({ medication });
      comp.ngOnInit();

      expect(comp.medication).toEqual(medication);
    });
  });

  describe('save', () => {
    it('Should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IMedication>>();
      const medication = { id: 'ABC' };
      jest.spyOn(medicationFormService, 'getMedication').mockReturnValue(medication);
      jest.spyOn(medicationService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medication });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: medication }));
      saveSubject.complete();

      // THEN
      expect(medicationFormService.getMedication).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(medicationService.update).toHaveBeenCalledWith(expect.objectContaining(medication));
      expect(comp.isSaving).toEqual(false);
    });

    it('Should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IMedication>>();
      const medication = { id: 'ABC' };
      jest.spyOn(medicationFormService, 'getMedication').mockReturnValue({ id: null });
      jest.spyOn(medicationService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medication: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: medication }));
      saveSubject.complete();

      // THEN
      expect(medicationFormService.getMedication).toHaveBeenCalled();
      expect(medicationService.create).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('Should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IMedication>>();
      const medication = { id: 'ABC' };
      jest.spyOn(medicationService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medication });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(medicationService.update).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
