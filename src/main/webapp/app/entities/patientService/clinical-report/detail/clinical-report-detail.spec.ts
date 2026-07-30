import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ClinicalReportDetailComponent } from './clinical-report-detail';

// SKIPPED: needs the Angular 20 TestBed.tick() API for httpResource-backed components.
// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.
describe.skip('ClinicalReport Management Detail Component', () => {
  let comp: ClinicalReportDetailComponent;
  let fixture: ComponentFixture<ClinicalReportDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), MatIconModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), 
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./clinical-report-detail').then(m => m.ClinicalReportDetailComponent),
              resolve: { clinicalReport: () => of({ id: '01933c67-ade2-4ab5-a4bb-6f68a83c4787' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ClinicalReportDetailComponent);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load clinicalReport on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', ClinicalReportDetailComponent);

      // THEN
      expect(instance.clinicalReport()).toEqual(expect.objectContaining({ id: '01933c67-ade2-4ab5-a4bb-6f68a83c4787' }));
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
