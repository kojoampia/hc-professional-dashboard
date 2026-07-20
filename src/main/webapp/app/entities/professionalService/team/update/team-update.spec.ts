import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { TeamService } from '../service/team.service';
import { ITeam } from '../team.model';

import { TeamFormService } from './team-form.service';
import { TeamUpdate } from './team-update';

describe('Team Management Update Component', () => {
  let comp: TeamUpdate;
  let fixture: ComponentFixture<TeamUpdate>;
  let activatedRoute: ActivatedRoute;
  let teamFormService: TeamFormService;
  let teamService: TeamService;

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

    fixture = TestBed.createComponent(TeamUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    teamFormService = TestBed.inject(TeamFormService);
    teamService = TestBed.inject(TeamService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const team: ITeam = { id: 'e82fb6d5-fe08-47fe-a516-8889cd5f9288' };

      activatedRoute.data = of({ team });
      comp.ngOnInit();

      expect(comp.team).toEqual(team);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<ITeam>();
      const team = { id: '07c2eeb9-6f13-455e-bbad-df15a9442470' };
      vitest.spyOn(teamFormService, 'getTeam').mockReturnValue(team);
      vitest.spyOn(teamService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ team });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(team);
      saveSubject.complete();

      // THEN
      expect(teamFormService.getTeam).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(teamService.update).toHaveBeenCalledWith(expect.objectContaining(team));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<ITeam>();
      const team = { id: '07c2eeb9-6f13-455e-bbad-df15a9442470' };
      vitest.spyOn(teamFormService, 'getTeam').mockReturnValue({ id: null });
      vitest.spyOn(teamService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ team: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(team);
      saveSubject.complete();

      // THEN
      expect(teamFormService.getTeam).toHaveBeenCalled();
      expect(teamService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<ITeam>();
      const team = { id: '07c2eeb9-6f13-455e-bbad-df15a9442470' };
      vitest.spyOn(teamService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ team });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(teamService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
