import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, from } from 'rxjs';

import { StatService } from '../service/stat.service';
import { IStat } from '../stat.model';
import { StatFormService } from './stat-form.service';

import { StatUpdateComponent } from './stat-update.component';

describe('Stat Management Update Component', () => {
  let comp: StatUpdateComponent;
  let fixture: ComponentFixture<StatUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let statFormService: StatFormService;
  let statService: StatService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), StatUpdateComponent],
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
      ],
    })
      .overrideTemplate(StatUpdateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(StatUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    statFormService = TestBed.inject(StatFormService);
    statService = TestBed.inject(StatService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('Should update editForm', () => {
      const stat: IStat = { id: 'CBA' };

      activatedRoute.data = of({ stat });
      comp.ngOnInit();

      expect(comp.stat).toEqual(stat);
    });
  });

  describe('save', () => {
    it('Should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IStat>>();
      const stat = { id: 'ABC' };
      jest.spyOn(statFormService, 'getStat').mockReturnValue(stat);
      jest.spyOn(statService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ stat });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: stat }));
      saveSubject.complete();

      // THEN
      expect(statFormService.getStat).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(statService.update).toHaveBeenCalledWith(expect.objectContaining(stat));
      expect(comp.isSaving).toEqual(false);
    });

    it('Should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IStat>>();
      const stat = { id: 'ABC' };
      jest.spyOn(statFormService, 'getStat').mockReturnValue({ id: null });
      jest.spyOn(statService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ stat: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: stat }));
      saveSubject.complete();

      // THEN
      expect(statFormService.getStat).toHaveBeenCalled();
      expect(statService.create).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('Should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IStat>>();
      const stat = { id: 'ABC' };
      jest.spyOn(statService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ stat });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(statService.update).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
