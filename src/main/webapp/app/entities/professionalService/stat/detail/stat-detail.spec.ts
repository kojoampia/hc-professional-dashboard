import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { StatDetail } from './stat-detail';

describe('Stat Management Detail Component', () => {
  let comp: StatDetail;
  let fixture: ComponentFixture<StatDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./stat-detail').then(m => m.StatDetail),
              resolve: { stat: () => of({ id: 'e1b57b21-907f-4aea-81a7-6357e9764b6e' }) },
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
    fixture = TestBed.createComponent(StatDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load stat on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', StatDetail);

      // THEN
      expect(instance.stat()).toEqual(expect.objectContaining({ id: 'e1b57b21-907f-4aea-81a7-6357e9764b6e' }));
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
