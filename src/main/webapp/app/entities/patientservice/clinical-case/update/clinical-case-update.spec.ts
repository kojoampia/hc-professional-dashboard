import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IRecommendation } from 'app/entities/patientservice/recommendation/recommendation.model';
import { RecommendationService } from 'app/entities/patientservice/recommendation/service/recommendation.service';
import { IClinicalCase } from '../clinical-case.model';
import { ClinicalCaseService } from '../service/clinical-case.service';

import { ClinicalCaseFormService } from './clinical-case-form.service';
import { ClinicalCaseUpdateComponent } from './clinical-case-update';

describe('ClinicalCase Management Update Component', () => {
  let comp: ClinicalCaseUpdateComponent;
  let fixture: ComponentFixture<ClinicalCaseUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let clinicalCaseFormService: ClinicalCaseFormService;
  let clinicalCaseService: ClinicalCaseService;
  let recommendationService: RecommendationService;

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

    fixture = TestBed.createComponent(ClinicalCaseUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    clinicalCaseFormService = TestBed.inject(ClinicalCaseFormService);
    clinicalCaseService = TestBed.inject(ClinicalCaseService);
    recommendationService = TestBed.inject(RecommendationService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call Recommendation query and add missing value', () => {
      const clinicalCase: IClinicalCase = { id: '33d51bc6-c2a3-4dc7-91e1-19b974078495' };
      const recommendations: IRecommendation[] = [{ id: 'd9c30eb8-00d3-4951-89c3-922dfba6713f' }];
      clinicalCase.recommendations = recommendations;

      const recommendationCollection: IRecommendation[] = [{ id: 'd9c30eb8-00d3-4951-89c3-922dfba6713f' }];
      jest.spyOn(recommendationService, 'query').mockReturnValue(of(new HttpResponse({ body: recommendationCollection })));
      const additionalRecommendations = [...recommendations];
      const expectedCollection: IRecommendation[] = [...additionalRecommendations, ...recommendationCollection];
      jest.spyOn(recommendationService, 'addRecommendationToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ clinicalCase });
      comp.ngOnInit();

      expect(recommendationService.query).toHaveBeenCalled();
      expect(recommendationService.addRecommendationToCollectionIfMissing).toHaveBeenCalledWith(
        recommendationCollection,
        ...additionalRecommendations.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.recommendationsSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const clinicalCase: IClinicalCase = { id: '33d51bc6-c2a3-4dc7-91e1-19b974078495' };
      const recommendation: IRecommendation = { id: 'd9c30eb8-00d3-4951-89c3-922dfba6713f' };
      clinicalCase.recommendations = [recommendation];

      activatedRoute.data = of({ clinicalCase });
      comp.ngOnInit();

      expect(comp.recommendationsSharedCollection()).toContainEqual(recommendation);
      expect(comp.clinicalCase).toEqual(clinicalCase);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IClinicalCase>();
      const clinicalCase = { id: 'c86c0474-01e3-4853-a5ae-fd336f26f404' };
      jest.spyOn(clinicalCaseFormService, 'getClinicalCase').mockReturnValue(clinicalCase);
      jest.spyOn(clinicalCaseService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ clinicalCase });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(clinicalCase);
      saveSubject.complete();

      // THEN
      expect(clinicalCaseFormService.getClinicalCase).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(clinicalCaseService.update).toHaveBeenCalledWith(expect.objectContaining(clinicalCase));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IClinicalCase>();
      const clinicalCase = { id: 'c86c0474-01e3-4853-a5ae-fd336f26f404' };
      jest.spyOn(clinicalCaseFormService, 'getClinicalCase').mockReturnValue({ id: null });
      jest.spyOn(clinicalCaseService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ clinicalCase: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(clinicalCase);
      saveSubject.complete();

      // THEN
      expect(clinicalCaseFormService.getClinicalCase).toHaveBeenCalled();
      expect(clinicalCaseService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IClinicalCase>();
      const clinicalCase = { id: 'c86c0474-01e3-4853-a5ae-fd336f26f404' };
      jest.spyOn(clinicalCaseService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ clinicalCase });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(clinicalCaseService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareRecommendation', () => {
      it('should forward to recommendationService', () => {
        const entity = { id: 'd9c30eb8-00d3-4951-89c3-922dfba6713f' };
        const entity2 = { id: '2e47b4d2-6e4d-4a88-b2e5-53d11f69859b' };
        jest.spyOn(recommendationService, 'compareRecommendation');
        comp.compareRecommendation(entity, entity2);
        expect(recommendationService.compareRecommendation).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
