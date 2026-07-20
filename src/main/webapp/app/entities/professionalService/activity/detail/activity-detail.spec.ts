import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ActivityDetail } from './activity-detail';

describe('Activity Management Detail Component', () => {
  let comp: ActivityDetail;
  let fixture: ComponentFixture<ActivityDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./activity-detail').then(m => m.ActivityDetail),
              resolve: { activity: () => of({ id: '1e3cd754-7fbf-4a55-b6f2-b6b9e9c31901' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faArrowLeft);
    library.addIcons(faPencilAlt);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load activity on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', ActivityDetail);

      // THEN
      expect(instance.activity()).toEqual(expect.objectContaining({ id: '1e3cd754-7fbf-4a55-b6f2-b6b9e9c31901' }));
    });
  });

  describe('PreviousState', () => {
    it('should navigate to previous state', () => {
      vitest.spyOn(globalThis.history, 'back');
      comp.previousState();
      expect(globalThis.history.back).toHaveBeenCalled();
    });
  });
});
