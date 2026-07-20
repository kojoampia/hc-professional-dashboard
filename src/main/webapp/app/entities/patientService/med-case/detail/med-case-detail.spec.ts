import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { MedCaseDetail } from './med-case-detail';

describe('MedCase Management Detail Component', () => {
  let comp: MedCaseDetail;
  let fixture: ComponentFixture<MedCaseDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./med-case-detail').then(m => m.MedCaseDetail),
              resolve: { medCase: () => of({ id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' }) },
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
    fixture = TestBed.createComponent(MedCaseDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load medCase on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', MedCaseDetail);

      // THEN
      expect(instance.medCase()).toEqual(expect.objectContaining({ id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' }));
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
