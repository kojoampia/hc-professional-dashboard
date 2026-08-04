import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ClinicalCaseDetailComponent } from './clinical-case-detail';

// SKIPPED: needs the Angular 20 TestBed.tick() API for httpResource-backed components.
// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.
describe.skip('ClinicalCase Management Detail Component', () => {
  let comp: ClinicalCaseDetailComponent;
  let fixture: ComponentFixture<ClinicalCaseDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), MatIconModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./clinical-case-detail').then(m => m.ClinicalCaseDetailComponent),
              resolve: { clinicalCase: () => of({ id: 'c86c0474-01e3-4853-a5ae-fd336f26f404' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ClinicalCaseDetailComponent);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load clinicalCase on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', ClinicalCaseDetailComponent);

      // THEN
      expect(instance.clinicalCase()).toEqual(expect.objectContaining({ id: 'c86c0474-01e3-4853-a5ae-fd336f26f404' }));
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
