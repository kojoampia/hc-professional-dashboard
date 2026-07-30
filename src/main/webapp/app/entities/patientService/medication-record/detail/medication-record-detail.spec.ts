import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { MedicationRecordDetailComponent } from './medication-record-detail';

// SKIPPED: needs Angular 20's TestBed.tick() for httpResource-backed components.
// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.
describe.skip('MedicationRecord Management Detail Component', () => {
  let comp: MedicationRecordDetailComponent;
  let fixture: ComponentFixture<MedicationRecordDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), MatIconModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), 
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./medication-record-detail').then(m => m.MedicationRecordDetailComponent),
              resolve: { medicationRecord: () => of({ id: 'bcabc4b7-675f-4d12-b963-1a937080e486' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicationRecordDetailComponent);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load medicationRecord on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', MedicationRecordDetailComponent);

      // THEN
      expect(instance.medicationRecord()).toEqual(expect.objectContaining({ id: 'bcabc4b7-675f-4d12-b963-1a937080e486' }));
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
