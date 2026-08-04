import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IDutyRoster } from 'app/entities/professionalservice/duty-roster/duty-roster.model';
import { DutyRosterService } from 'app/entities/professionalservice/duty-roster/service/duty-roster.service';
import { IDutyShift } from '../duty-shift.model';
import { DutyShiftService } from '../service/duty-shift.service';

import { DutyShiftFormService } from './duty-shift-form.service';
import { DutyShiftUpdateComponent } from './duty-shift-update';

describe('DutyShift Management Update Component', () => {
  let comp: DutyShiftUpdateComponent;
  let fixture: ComponentFixture<DutyShiftUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let dutyShiftFormService: DutyShiftFormService;
  let dutyShiftService: DutyShiftService;
  let dutyRosterService: DutyRosterService;

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

    fixture = TestBed.createComponent(DutyShiftUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    dutyShiftFormService = TestBed.inject(DutyShiftFormService);
    dutyShiftService = TestBed.inject(DutyShiftService);
    dutyRosterService = TestBed.inject(DutyRosterService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call DutyRoster query and add missing value', () => {
      const dutyShift: IDutyShift = { id: '5443a25c-9a48-49e8-b45b-70616c4edc8f' };
      const roster: IDutyRoster = { id: '401a8b55-3dcb-46fc-bb91-cbfc48b18166' };
      dutyShift.roster = roster;

      const dutyRosterCollection: IDutyRoster[] = [{ id: '401a8b55-3dcb-46fc-bb91-cbfc48b18166' }];
      jest.spyOn(dutyRosterService, 'query').mockReturnValue(of(new HttpResponse({ body: dutyRosterCollection })));
      const additionalDutyRosters = [roster];
      const expectedCollection: IDutyRoster[] = [...additionalDutyRosters, ...dutyRosterCollection];
      jest.spyOn(dutyRosterService, 'addDutyRosterToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ dutyShift });
      comp.ngOnInit();

      expect(dutyRosterService.query).toHaveBeenCalled();
      expect(dutyRosterService.addDutyRosterToCollectionIfMissing).toHaveBeenCalledWith(
        dutyRosterCollection,
        ...additionalDutyRosters.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.dutyRostersSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const dutyShift: IDutyShift = { id: '5443a25c-9a48-49e8-b45b-70616c4edc8f' };
      const roster: IDutyRoster = { id: '401a8b55-3dcb-46fc-bb91-cbfc48b18166' };
      dutyShift.roster = roster;

      activatedRoute.data = of({ dutyShift });
      comp.ngOnInit();

      expect(comp.dutyRostersSharedCollection()).toContainEqual(roster);
      expect(comp.dutyShift).toEqual(dutyShift);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IDutyShift>();
      const dutyShift = { id: 'd8cc536f-4a6d-4219-87bf-9b74ed67c4f6' };
      jest.spyOn(dutyShiftFormService, 'getDutyShift').mockReturnValue(dutyShift);
      jest.spyOn(dutyShiftService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ dutyShift });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(dutyShift);
      saveSubject.complete();

      // THEN
      expect(dutyShiftFormService.getDutyShift).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(dutyShiftService.update).toHaveBeenCalledWith(expect.objectContaining(dutyShift));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IDutyShift>();
      const dutyShift = { id: 'd8cc536f-4a6d-4219-87bf-9b74ed67c4f6' };
      jest.spyOn(dutyShiftFormService, 'getDutyShift').mockReturnValue({ id: null });
      jest.spyOn(dutyShiftService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ dutyShift: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(dutyShift);
      saveSubject.complete();

      // THEN
      expect(dutyShiftFormService.getDutyShift).toHaveBeenCalled();
      expect(dutyShiftService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IDutyShift>();
      const dutyShift = { id: 'd8cc536f-4a6d-4219-87bf-9b74ed67c4f6' };
      jest.spyOn(dutyShiftService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ dutyShift });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(dutyShiftService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('compareDutyRoster', () => {
      it('should forward to dutyRosterService', () => {
        const entity = { id: '401a8b55-3dcb-46fc-bb91-cbfc48b18166' };
        const entity2 = { id: '86672097-b936-40af-b843-9a360e5aa112' };
        jest.spyOn(dutyRosterService, 'compareDutyRoster');
        comp.compareDutyRoster(entity, entity2);
        expect(dutyRosterService.compareDutyRoster).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
