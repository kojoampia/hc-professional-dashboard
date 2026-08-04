import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IRecommendation } from '../recommendation.model';
import { RecommendationService } from '../service/recommendation.service';

import { RecommendationFormService } from './recommendation-form.service';
import { RecommendationUpdateComponent } from './recommendation-update';

describe('Recommendation Management Update Component', () => {
  let comp: RecommendationUpdateComponent;
  let fixture: ComponentFixture<RecommendationUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let recommendationFormService: RecommendationFormService;
  let recommendationService: RecommendationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), MatIconModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: from([{}]),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(RecommendationUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    recommendationFormService = TestBed.inject(RecommendationFormService);
    recommendationService = TestBed.inject(RecommendationService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const recommendation: IRecommendation = { id: '2e47b4d2-6e4d-4a88-b2e5-53d11f69859b' };

      activatedRoute.data = of({ recommendation });
      comp.ngOnInit();

      expect(comp.recommendation).toEqual(recommendation);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IRecommendation>();
      const recommendation = { id: 'd9c30eb8-00d3-4951-89c3-922dfba6713f' };
      jest.spyOn(recommendationFormService, 'getRecommendation').mockReturnValue(recommendation);
      jest.spyOn(recommendationService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ recommendation });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(recommendation);
      saveSubject.complete();

      // THEN
      expect(recommendationFormService.getRecommendation).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(recommendationService.update).toHaveBeenCalledWith(expect.objectContaining(recommendation));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IRecommendation>();
      const recommendation = { id: 'd9c30eb8-00d3-4951-89c3-922dfba6713f' };
      jest.spyOn(recommendationFormService, 'getRecommendation').mockReturnValue({ id: null });
      jest.spyOn(recommendationService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ recommendation: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(recommendation);
      saveSubject.complete();

      // THEN
      expect(recommendationFormService.getRecommendation).toHaveBeenCalled();
      expect(recommendationService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IRecommendation>();
      const recommendation = { id: 'd9c30eb8-00d3-4951-89c3-922dfba6713f' };
      jest.spyOn(recommendationService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ recommendation });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(recommendationService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
