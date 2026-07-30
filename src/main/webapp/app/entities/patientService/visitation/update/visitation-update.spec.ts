import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { VisitationService } from '../service/visitation.service';
import { IVisitation } from '../visitation.model';

import { VisitationFormService } from './visitation-form.service';
import { VisitationUpdateComponent } from './visitation-update';

describe('Visitation Management Update Component', () => {
  let comp: VisitationUpdateComponent;
  let fixture: ComponentFixture<VisitationUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let visitationFormService: VisitationFormService;
  let visitationService: VisitationService;

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

    fixture = TestBed.createComponent(VisitationUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    visitationFormService = TestBed.inject(VisitationFormService);
    visitationService = TestBed.inject(VisitationService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const visitation: IVisitation = { id: '26c2af9e-8986-493f-83fa-aa48e5337bd9' };

      activatedRoute.data = of({ visitation });
      comp.ngOnInit();

      expect(comp.visitation).toEqual(visitation);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IVisitation>();
      const visitation = { id: '9b4f6bb1-0c86-45a9-a55b-dd48e1bddef9' };
      jest.spyOn(visitationFormService, 'getVisitation').mockReturnValue(visitation);
      jest.spyOn(visitationService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ visitation });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(visitation);
      saveSubject.complete();

      // THEN
      expect(visitationFormService.getVisitation).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(visitationService.update).toHaveBeenCalledWith(expect.objectContaining(visitation));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IVisitation>();
      const visitation = { id: '9b4f6bb1-0c86-45a9-a55b-dd48e1bddef9' };
      jest.spyOn(visitationFormService, 'getVisitation').mockReturnValue({ id: null });
      jest.spyOn(visitationService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ visitation: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(visitation);
      saveSubject.complete();

      // THEN
      expect(visitationFormService.getVisitation).toHaveBeenCalled();
      expect(visitationService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IVisitation>();
      const visitation = { id: '9b4f6bb1-0c86-45a9-a55b-dd48e1bddef9' };
      jest.spyOn(visitationService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ visitation });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(visitationService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
