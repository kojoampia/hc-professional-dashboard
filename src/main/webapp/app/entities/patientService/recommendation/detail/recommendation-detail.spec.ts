import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { RecommendationDetailComponent } from './recommendation-detail';

// SKIPPED: needs Angular 20's TestBed.tick() for httpResource-backed components.
// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.
describe.skip('Recommendation Management Detail Component', () => {
  let comp: RecommendationDetailComponent;
  let fixture: ComponentFixture<RecommendationDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), MatIconModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), 
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./recommendation-detail').then(m => m.RecommendationDetailComponent),
              resolve: { recommendation: () => of({ id: 'd9c30eb8-00d3-4951-89c3-922dfba6713f' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RecommendationDetailComponent);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load recommendation on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', RecommendationDetailComponent);

      // THEN
      expect(instance.recommendation()).toEqual(expect.objectContaining({ id: 'd9c30eb8-00d3-4951-89c3-922dfba6713f' }));
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
