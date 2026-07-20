import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IActivity } from '../activity.model';
import { ActivityService } from '../service/activity.service';

import { ActivityFormService } from './activity-form.service';
import { ActivityUpdate } from './activity-update';

describe('Activity Management Update Component', () => {
  let comp: ActivityUpdate;
  let fixture: ComponentFixture<ActivityUpdate>;
  let activatedRoute: ActivatedRoute;
  let activityFormService: ActivityFormService;
  let activityService: ActivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: from([{}]),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ActivityUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    activityFormService = TestBed.inject(ActivityFormService);
    activityService = TestBed.inject(ActivityService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const activity: IActivity = { id: 'fee48f48-5276-4201-a597-a956732a5cc2' };

      activatedRoute.data = of({ activity });
      comp.ngOnInit();

      expect(comp.activity).toEqual(activity);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IActivity>();
      const activity = { id: '1e3cd754-7fbf-4a55-b6f2-b6b9e9c31901' };
      vitest.spyOn(activityFormService, 'getActivity').mockReturnValue(activity);
      vitest.spyOn(activityService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ activity });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(activity);
      saveSubject.complete();

      // THEN
      expect(activityFormService.getActivity).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(activityService.update).toHaveBeenCalledWith(expect.objectContaining(activity));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IActivity>();
      const activity = { id: '1e3cd754-7fbf-4a55-b6f2-b6b9e9c31901' };
      vitest.spyOn(activityFormService, 'getActivity').mockReturnValue({ id: null });
      vitest.spyOn(activityService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ activity: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(activity);
      saveSubject.complete();

      // THEN
      expect(activityFormService.getActivity).toHaveBeenCalled();
      expect(activityService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IActivity>();
      const activity = { id: '1e3cd754-7fbf-4a55-b6f2-b6b9e9c31901' };
      vitest.spyOn(activityService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ activity });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(activityService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
