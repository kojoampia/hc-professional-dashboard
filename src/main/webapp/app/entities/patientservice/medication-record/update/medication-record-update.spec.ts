import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IMedicationRecord } from '../medication-record.model';
import { MedicationRecordService } from '../service/medication-record.service';

import { MedicationRecordFormService } from './medication-record-form.service';
import { MedicationRecordUpdateComponent } from './medication-record-update';

describe('MedicationRecord Management Update Component', () => {
  let comp: MedicationRecordUpdateComponent;
  let fixture: ComponentFixture<MedicationRecordUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let medicationRecordFormService: MedicationRecordFormService;
  let medicationRecordService: MedicationRecordService;

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

    fixture = TestBed.createComponent(MedicationRecordUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    medicationRecordFormService = TestBed.inject(MedicationRecordFormService);
    medicationRecordService = TestBed.inject(MedicationRecordService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const medicationRecord: IMedicationRecord = { id: '578f52e3-4be5-49e6-aee0-253ab127033d' };

      activatedRoute.data = of({ medicationRecord });
      comp.ngOnInit();

      expect(comp.medicationRecord).toEqual(medicationRecord);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IMedicationRecord>();
      const medicationRecord = { id: 'bcabc4b7-675f-4d12-b963-1a937080e486' };
      jest.spyOn(medicationRecordFormService, 'getMedicationRecord').mockReturnValue(medicationRecord);
      jest.spyOn(medicationRecordService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medicationRecord });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(medicationRecord);
      saveSubject.complete();

      // THEN
      expect(medicationRecordFormService.getMedicationRecord).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(medicationRecordService.update).toHaveBeenCalledWith(expect.objectContaining(medicationRecord));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IMedicationRecord>();
      const medicationRecord = { id: 'bcabc4b7-675f-4d12-b963-1a937080e486' };
      jest.spyOn(medicationRecordFormService, 'getMedicationRecord').mockReturnValue({ id: null });
      jest.spyOn(medicationRecordService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medicationRecord: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(medicationRecord);
      saveSubject.complete();

      // THEN
      expect(medicationRecordFormService.getMedicationRecord).toHaveBeenCalled();
      expect(medicationRecordService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IMedicationRecord>();
      const medicationRecord = { id: 'bcabc4b7-675f-4d12-b963-1a937080e486' };
      jest.spyOn(medicationRecordService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ medicationRecord });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(medicationRecordService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
