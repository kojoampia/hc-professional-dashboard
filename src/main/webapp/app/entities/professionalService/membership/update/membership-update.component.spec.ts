import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, from } from 'rxjs';

import { MembershipService } from '../service/membership.service';
import { IMembership } from '../membership.model';
import { MembershipFormService } from './membership-form.service';

import { MembershipUpdateComponent } from './membership-update.component';

describe('Membership Management Update Component', () => {
  let comp: MembershipUpdateComponent;
  let fixture: ComponentFixture<MembershipUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let membershipFormService: MembershipFormService;
  let membershipService: MembershipService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), MembershipUpdateComponent],
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
      .overrideTemplate(MembershipUpdateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(MembershipUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    membershipFormService = TestBed.inject(MembershipFormService);
    membershipService = TestBed.inject(MembershipService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('Should update editForm', () => {
      const membership: IMembership = { id: 'CBA' };

      activatedRoute.data = of({ membership });
      comp.ngOnInit();

      expect(comp.membership).toEqual(membership);
    });
  });

  describe('save', () => {
    it('Should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IMembership>>();
      const membership = { id: 'ABC' };
      jest.spyOn(membershipFormService, 'getMembership').mockReturnValue(membership);
      jest.spyOn(membershipService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ membership });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: membership }));
      saveSubject.complete();

      // THEN
      expect(membershipFormService.getMembership).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(membershipService.update).toHaveBeenCalledWith(expect.objectContaining(membership));
      expect(comp.isSaving).toEqual(false);
    });

    it('Should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IMembership>>();
      const membership = { id: 'ABC' };
      jest.spyOn(membershipFormService, 'getMembership').mockReturnValue({ id: null });
      jest.spyOn(membershipService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ membership: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: membership }));
      saveSubject.complete();

      // THEN
      expect(membershipFormService.getMembership).toHaveBeenCalled();
      expect(membershipService.create).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('Should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IMembership>>();
      const membership = { id: 'ABC' };
      jest.spyOn(membershipService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ membership });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(membershipService.update).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
