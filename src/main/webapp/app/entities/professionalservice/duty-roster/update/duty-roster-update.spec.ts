import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IHealthConnectProfessional } from 'app/entities/professionalservice/health-connect-professional/health-connect-professional.model';
import { HealthConnectProfessionalService } from 'app/entities/professionalservice/health-connect-professional/service/health-connect-professional.service';
import { IDutyRoster } from '../duty-roster.model';
import { DutyRosterService } from '../service/duty-roster.service';

import { DutyRosterFormService } from './duty-roster-form.service';
import { DutyRosterUpdateComponent } from './duty-roster-update';

describe('DutyRoster Management Update Component', () => {
  let comp: DutyRosterUpdateComponent;
  let fixture: ComponentFixture<DutyRosterUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let dutyRosterFormService: DutyRosterFormService;
  let dutyRosterService: DutyRosterService;
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

    fixture = TestBed.createComponent(DutyRosterUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    dutyRosterFormService = TestBed.inject(DutyRosterFormService);
    dutyRosterService = TestBed.inject(DutyRosterService);
    healthConnectProfessionalService = TestBed.inject(HealthConnectProfessionalService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call HealthConnectProfessional query and add missing value', () => {
      const dutyRoster: IDutyRoster = { id: '86672097-b936-40af-b843-9a360e5aa112' };
      const subscribedProfessionals: IHealthConnectProfessional[] = [{ id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' }];
      dutyRoster.subscribedProfessionals = subscribedProfessionals;

      const healthConnectProfessionalCollection: IHealthConnectProfessional[] = [{ id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' }];
      jest
        .spyOn(healthConnectProfessionalService, 'query')
        .mockReturnValue(of(new HttpResponse({ body: healthConnectProfessionalCollection })));
      const additionalHealthConnectProfessionals = [...subscribedProfessionals];
      const expectedCollection: IHealthConnectProfessional[] = [
        ...additionalHealthConnectProfessionals,
        ...healthConnectProfessionalCollection,
      ];
      jest.spyOn(healthConnectProfessionalService, 'addHealthConnectProfessionalToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ dutyRoster });
      comp.ngOnInit();

      expect(healthConnectProfessionalService.query).toHaveBeenCalled();
      expect(healthConnectProfessionalService.addHealthConnectProfessionalToCollectionIfMissing).toHaveBeenCalledWith(
        healthConnectProfessionalCollection,
        ...additionalHealthConnectProfessionals.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.healthConnectProfessionalsSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const dutyRoster: IDutyRoster = { id: '86672097-b936-40af-b843-9a360e5aa112' };
      const subscribedProfessional: IHealthConnectProfessional = { id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' };
      dutyRoster.subscribedProfessionals = [subscribedProfessional];

      activatedRoute.data = of({ dutyRoster });
      comp.ngOnInit();

      expect(comp.healthConnectProfessionalsSharedCollection()).toContainEqual(subscribedProfessional);
      expect(comp.dutyRoster).toEqual(dutyRoster);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IDutyRoster>();
      const dutyRoster = { id: '401a8b55-3dcb-46fc-bb91-cbfc48b18166' };
      jest.spyOn(dutyRosterFormService, 'getDutyRoster').mockReturnValue(dutyRoster);
      jest.spyOn(dutyRosterService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ dutyRoster });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(dutyRoster);
      saveSubject.complete();

      // THEN
      expect(dutyRosterFormService.getDutyRoster).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(dutyRosterService.update).toHaveBeenCalledWith(expect.objectContaining(dutyRoster));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IDutyRoster>();
      const dutyRoster = { id: '401a8b55-3dcb-46fc-bb91-cbfc48b18166' };
      jest.spyOn(dutyRosterFormService, 'getDutyRoster').mockReturnValue({ id: null });
      jest.spyOn(dutyRosterService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ dutyRoster: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(dutyRoster);
      saveSubject.complete();

      // THEN
      expect(dutyRosterFormService.getDutyRoster).toHaveBeenCalled();
      expect(dutyRosterService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IDutyRoster>();
      const dutyRoster = { id: '401a8b55-3dcb-46fc-bb91-cbfc48b18166' };
      jest.spyOn(dutyRosterService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ dutyRoster });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(dutyRosterService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareHealthConnectProfessional', () => {
      it('should forward to healthConnectProfessionalService', () => {
        const entity = { id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' };
        const entity2 = { id: '657f7ab4-8eaa-4fa9-89d3-0d571cfd2bb2' };
        jest.spyOn(healthConnectProfessionalService, 'compareHealthConnectProfessional');
        comp.compareHealthConnectProfessional(entity, entity2);
        expect(healthConnectProfessionalService.compareHealthConnectProfessional).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
