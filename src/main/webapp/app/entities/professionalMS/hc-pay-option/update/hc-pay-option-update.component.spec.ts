import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, from } from 'rxjs';

import { HCPayOptionService } from '../service/hc-pay-option.service';
import { IHCPayOption } from '../hc-pay-option.model';
import { HCPayOptionFormService } from './hc-pay-option-form.service';

import { HCPayOptionUpdateComponent } from './hc-pay-option-update.component';

describe('HCPayOption Management Update Component', () => {
  let comp: HCPayOptionUpdateComponent;
  let fixture: ComponentFixture<HCPayOptionUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let hCPayOptionFormService: HCPayOptionFormService;
  let hCPayOptionService: HCPayOptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), HCPayOptionUpdateComponent],
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
      .overrideTemplate(HCPayOptionUpdateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(HCPayOptionUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    hCPayOptionFormService = TestBed.inject(HCPayOptionFormService);
    hCPayOptionService = TestBed.inject(HCPayOptionService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('Should update editForm', () => {
      const hCPayOption: IHCPayOption = { id: 'CBA' };

      activatedRoute.data = of({ hCPayOption });
      comp.ngOnInit();

      expect(comp.hCPayOption).toEqual(hCPayOption);
    });
  });

  describe('save', () => {
    it('Should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IHCPayOption>>();
      const hCPayOption = { id: 'ABC' };
      jest.spyOn(hCPayOptionFormService, 'getHCPayOption').mockReturnValue(hCPayOption);
      jest.spyOn(hCPayOptionService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ hCPayOption });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: hCPayOption }));
      saveSubject.complete();

      // THEN
      expect(hCPayOptionFormService.getHCPayOption).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(hCPayOptionService.update).toHaveBeenCalledWith(expect.objectContaining(hCPayOption));
      expect(comp.isSaving).toEqual(false);
    });

    it('Should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IHCPayOption>>();
      const hCPayOption = { id: 'ABC' };
      jest.spyOn(hCPayOptionFormService, 'getHCPayOption').mockReturnValue({ id: null });
      jest.spyOn(hCPayOptionService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ hCPayOption: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: hCPayOption }));
      saveSubject.complete();

      // THEN
      expect(hCPayOptionFormService.getHCPayOption).toHaveBeenCalled();
      expect(hCPayOptionService.create).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('Should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IHCPayOption>>();
      const hCPayOption = { id: 'ABC' };
      jest.spyOn(hCPayOptionService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ hCPayOption });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(hCPayOptionService.update).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
