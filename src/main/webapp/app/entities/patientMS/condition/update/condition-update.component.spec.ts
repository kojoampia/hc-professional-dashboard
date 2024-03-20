import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, from } from 'rxjs';

import { ConditionService } from '../service/condition.service';
import { ICondition } from '../condition.model';
import { ConditionFormService } from './condition-form.service';

import { ConditionUpdateComponent } from './condition-update.component';

describe('Condition Management Update Component', () => {
  let comp: ConditionUpdateComponent;
  let fixture: ComponentFixture<ConditionUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let conditionFormService: ConditionFormService;
  let conditionService: ConditionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes([]), ConditionUpdateComponent],
      providers: [
        FormBuilder,
        {
          provide: ActivatedRoute,
          useValue: {
            params: from([{}]),
          },
        },
      ],
    })
      .overrideTemplate(ConditionUpdateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(ConditionUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    conditionFormService = TestBed.inject(ConditionFormService);
    conditionService = TestBed.inject(ConditionService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('Should update editForm', () => {
      const condition: ICondition = { id: 'CBA' };

      activatedRoute.data = of({ condition });
      comp.ngOnInit();

      expect(comp.condition).toEqual(condition);
    });
  });

  describe('save', () => {
    it('Should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<ICondition>>();
      const condition = { id: 'ABC' };
      jest.spyOn(conditionFormService, 'getCondition').mockReturnValue(condition);
      jest.spyOn(conditionService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ condition });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: condition }));
      saveSubject.complete();

      // THEN
      expect(conditionFormService.getCondition).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(conditionService.update).toHaveBeenCalledWith(expect.objectContaining(condition));
      expect(comp.isSaving).toEqual(false);
    });

    it('Should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<ICondition>>();
      const condition = { id: 'ABC' };
      jest.spyOn(conditionFormService, 'getCondition').mockReturnValue({ id: null });
      jest.spyOn(conditionService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ condition: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: condition }));
      saveSubject.complete();

      // THEN
      expect(conditionFormService.getCondition).toHaveBeenCalled();
      expect(conditionService.create).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('Should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<ICondition>>();
      const condition = { id: 'ABC' };
      jest.spyOn(conditionService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ condition });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(conditionService.update).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
