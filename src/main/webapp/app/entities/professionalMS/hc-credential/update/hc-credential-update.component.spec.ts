import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, from } from 'rxjs';

import { HCCredentialService } from '../service/hc-credential.service';
import { IHCCredential } from '../hc-credential.model';
import { HCCredentialFormService } from './hc-credential-form.service';

import { HCCredentialUpdateComponent } from './hc-credential-update.component';

describe('HCCredential Management Update Component', () => {
  let comp: HCCredentialUpdateComponent;
  let fixture: ComponentFixture<HCCredentialUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let hCCredentialFormService: HCCredentialFormService;
  let hCCredentialService: HCCredentialService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), HCCredentialUpdateComponent],
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
      .overrideTemplate(HCCredentialUpdateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(HCCredentialUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    hCCredentialFormService = TestBed.inject(HCCredentialFormService);
    hCCredentialService = TestBed.inject(HCCredentialService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('Should update editForm', () => {
      const hCCredential: IHCCredential = { id: 'CBA' };

      activatedRoute.data = of({ hCCredential });
      comp.ngOnInit();

      expect(comp.hCCredential).toEqual(hCCredential);
    });
  });

  describe('save', () => {
    it('Should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IHCCredential>>();
      const hCCredential = { id: 'ABC' };
      jest.spyOn(hCCredentialFormService, 'getHCCredential').mockReturnValue(hCCredential);
      jest.spyOn(hCCredentialService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ hCCredential });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: hCCredential }));
      saveSubject.complete();

      // THEN
      expect(hCCredentialFormService.getHCCredential).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(hCCredentialService.update).toHaveBeenCalledWith(expect.objectContaining(hCCredential));
      expect(comp.isSaving).toEqual(false);
    });

    it('Should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IHCCredential>>();
      const hCCredential = { id: 'ABC' };
      jest.spyOn(hCCredentialFormService, 'getHCCredential').mockReturnValue({ id: null });
      jest.spyOn(hCCredentialService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ hCCredential: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: hCCredential }));
      saveSubject.complete();

      // THEN
      expect(hCCredentialFormService.getHCCredential).toHaveBeenCalled();
      expect(hCCredentialService.create).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('Should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IHCCredential>>();
      const hCCredential = { id: 'ABC' };
      jest.spyOn(hCCredentialService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ hCCredential });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(hCCredentialService.update).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
