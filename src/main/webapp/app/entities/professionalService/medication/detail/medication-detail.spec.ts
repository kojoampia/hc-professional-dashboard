import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { MedicationDetail } from './medication-detail';

describe('Medication Management Detail Component', () => {
  let comp: MedicationDetail;
  let fixture: ComponentFixture<MedicationDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./medication-detail').then(m => m.MedicationDetail),
              resolve: { medication: () => of({ id: 'cefe9515-9d76-403f-afa9-35f0d986275b' }) },
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
    fixture = TestBed.createComponent(MedicationDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load medication on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', MedicationDetail);

      // THEN
      expect(instance.medication()).toEqual(expect.objectContaining({ id: 'cefe9515-9d76-403f-afa9-35f0d986275b' }));
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
