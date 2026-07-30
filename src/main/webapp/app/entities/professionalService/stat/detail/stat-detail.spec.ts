import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { StatDetailComponent } from './stat-detail';

// SKIPPED: needs Angular 20's TestBed.tick() for httpResource-backed components.
// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.
describe.skip('Stat Management Detail Component', () => {
  let comp: StatDetailComponent;
  let fixture: ComponentFixture<StatDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), MatIconModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), 
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./stat-detail').then(m => m.StatDetailComponent),
              resolve: { stat: () => of({ id: 'e1b57b21-907f-4aea-81a7-6357e9764b6e' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StatDetailComponent);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load stat on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', StatDetailComponent);

      // THEN
      expect(instance.stat()).toEqual(expect.objectContaining({ id: 'e1b57b21-907f-4aea-81a7-6357e9764b6e' }));
    });
  });

  describe('PreviousState', () => {
    it('should navigate to previous state', () => {
      jest.spyOn(globalThis.history, 'back');
      comp.previousState();
      expect(globalThis.history.back).toHaveBeenCalled();
    });
  });
});
