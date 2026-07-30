import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { MedicationDetailComponent } from './medication-detail';

// SKIPPED: needs Angular 20's TestBed.tick() for httpResource-backed components.
// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.
describe.skip('Medication Management Detail Component', () => {
  let comp: MedicationDetailComponent;
  let fixture: ComponentFixture<MedicationDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), MatIconModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), 
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./medication-detail').then(m => m.MedicationDetailComponent),
              resolve: { medication: () => of({ id: 'cefe9515-9d76-403f-afa9-35f0d986275b' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicationDetailComponent);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load medication on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', MedicationDetailComponent);

      // THEN
      expect(instance.medication()).toEqual(expect.objectContaining({ id: 'cefe9515-9d76-403f-afa9-35f0d986275b' }));
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
