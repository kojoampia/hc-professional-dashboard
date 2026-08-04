import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IHealthConnectProfessional } from '../health-connect-professional.model';
import { HealthConnectProfessionalService } from '../service/health-connect-professional.service';

import { HealthConnectProfessionalFormService } from './health-connect-professional-form.service';
import { HealthConnectProfessionalUpdateComponent } from './health-connect-professional-update';

describe('HealthConnectProfessional Management Update Component', () => {
  let comp: HealthConnectProfessionalUpdateComponent;
  let fixture: ComponentFixture<HealthConnectProfessionalUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let healthConnectProfessionalFormService: HealthConnectProfessionalFormService;
  let healthConnectProfessionalService: HealthConnectProfessionalService;

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

    fixture = TestBed.createComponent(HealthConnectProfessionalUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    healthConnectProfessionalFormService = TestBed.inject(HealthConnectProfessionalFormService);
    healthConnectProfessionalService = TestBed.inject(HealthConnectProfessionalService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const healthConnectProfessional: IHealthConnectProfessional = { id: '657f7ab4-8eaa-4fa9-89d3-0d571cfd2bb2' };

      activatedRoute.data = of({ healthConnectProfessional });
      comp.ngOnInit();

      expect(comp.healthConnectProfessional).toEqual(healthConnectProfessional);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IHealthConnectProfessional>();
      const healthConnectProfessional = { id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' };
      jest.spyOn(healthConnectProfessionalFormService, 'getHealthConnectProfessional').mockReturnValue(healthConnectProfessional);
      jest.spyOn(healthConnectProfessionalService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ healthConnectProfessional });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(healthConnectProfessional);
      saveSubject.complete();

      // THEN
      expect(healthConnectProfessionalFormService.getHealthConnectProfessional).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(healthConnectProfessionalService.update).toHaveBeenCalledWith(expect.objectContaining(healthConnectProfessional));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IHealthConnectProfessional>();
      const healthConnectProfessional = { id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' };
      jest.spyOn(healthConnectProfessionalFormService, 'getHealthConnectProfessional').mockReturnValue({ id: null });
      jest.spyOn(healthConnectProfessionalService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ healthConnectProfessional: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(healthConnectProfessional);
      saveSubject.complete();

      // THEN
      expect(healthConnectProfessionalFormService.getHealthConnectProfessional).toHaveBeenCalled();
      expect(healthConnectProfessionalService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IHealthConnectProfessional>();
      const healthConnectProfessional = { id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' };
      jest.spyOn(healthConnectProfessionalService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ healthConnectProfessional });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(healthConnectProfessionalService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
