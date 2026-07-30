import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IActivityLogEntry } from '../activity-log-entry.model';
import { ActivityLogEntryService } from '../service/activity-log-entry.service';

import { ActivityLogEntryFormService } from './activity-log-entry-form.service';
import { ActivityLogEntryUpdateComponent } from './activity-log-entry-update';

describe('ActivityLogEntry Management Update Component', () => {
  let comp: ActivityLogEntryUpdateComponent;
  let fixture: ComponentFixture<ActivityLogEntryUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let activityLogEntryFormService: ActivityLogEntryFormService;
  let activityLogEntryService: ActivityLogEntryService;

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

    fixture = TestBed.createComponent(ActivityLogEntryUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    activityLogEntryFormService = TestBed.inject(ActivityLogEntryFormService);
    activityLogEntryService = TestBed.inject(ActivityLogEntryService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const activityLogEntry: IActivityLogEntry = { id: '362a7f42-2650-4a82-82a8-0ce5fdd9aa97' };

      activatedRoute.data = of({ activityLogEntry });
      comp.ngOnInit();

      expect(comp.activityLogEntry).toEqual(activityLogEntry);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IActivityLogEntry>();
      const activityLogEntry = { id: 'c9da8b1f-a382-46b2-8e36-4b0c64a54086' };
      jest.spyOn(activityLogEntryFormService, 'getActivityLogEntry').mockReturnValue(activityLogEntry);
      jest.spyOn(activityLogEntryService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ activityLogEntry });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(activityLogEntry);
      saveSubject.complete();

      // THEN
      expect(activityLogEntryFormService.getActivityLogEntry).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(activityLogEntryService.update).toHaveBeenCalledWith(expect.objectContaining(activityLogEntry));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IActivityLogEntry>();
      const activityLogEntry = { id: 'c9da8b1f-a382-46b2-8e36-4b0c64a54086' };
      jest.spyOn(activityLogEntryFormService, 'getActivityLogEntry').mockReturnValue({ id: null });
      jest.spyOn(activityLogEntryService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ activityLogEntry: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(activityLogEntry);
      saveSubject.complete();

      // THEN
      expect(activityLogEntryFormService.getActivityLogEntry).toHaveBeenCalled();
      expect(activityLogEntryService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IActivityLogEntry>();
      const activityLogEntry = { id: 'c9da8b1f-a382-46b2-8e36-4b0c64a54086' };
      jest.spyOn(activityLogEntryService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ activityLogEntry });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(activityLogEntryService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
