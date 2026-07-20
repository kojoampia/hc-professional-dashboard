import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { StatService } from '../service/stat.service';
import { IStat } from '../stat.model';

import { StatFormService } from './stat-form.service';
import { StatUpdate } from './stat-update';

describe('Stat Management Update Component', () => {
  let comp: StatUpdate;
  let fixture: ComponentFixture<StatUpdate>;
  let activatedRoute: ActivatedRoute;
  let statFormService: StatFormService;
  let statService: StatService;

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

    fixture = TestBed.createComponent(StatUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    statFormService = TestBed.inject(StatFormService);
    statService = TestBed.inject(StatService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const stat: IStat = { id: 'c0b92122-fd3b-4c3c-a79e-0a46abde7e78' };

      activatedRoute.data = of({ stat });
      comp.ngOnInit();

      expect(comp.stat).toEqual(stat);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IStat>();
      const stat = { id: 'e1b57b21-907f-4aea-81a7-6357e9764b6e' };
      vitest.spyOn(statFormService, 'getStat').mockReturnValue(stat);
      vitest.spyOn(statService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ stat });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(stat);
      saveSubject.complete();

      // THEN
      expect(statFormService.getStat).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(statService.update).toHaveBeenCalledWith(expect.objectContaining(stat));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IStat>();
      const stat = { id: 'e1b57b21-907f-4aea-81a7-6357e9764b6e' };
      vitest.spyOn(statFormService, 'getStat').mockReturnValue({ id: null });
      vitest.spyOn(statService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ stat: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(stat);
      saveSubject.complete();

      // THEN
      expect(statFormService.getStat).toHaveBeenCalled();
      expect(statService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IStat>();
      const stat = { id: 'e1b57b21-907f-4aea-81a7-6357e9764b6e' };
      vitest.spyOn(statService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ stat });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(statService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
