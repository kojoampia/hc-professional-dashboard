import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { MedCaseDetailComponent } from './med-case-detail';

describe('MedCase Management Detail Component', () => {
  let comp: MedCaseDetailComponent;
  let fixture: ComponentFixture<MedCaseDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./med-case-detail').then(m => m.MedCaseDetailComponent),
              resolve: { medCase: () => of({ id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MedCaseDetailComponent);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load medCase on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', MedCaseDetailComponent);

      // THEN
      expect(instance.medCase()).toEqual(expect.objectContaining({ id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' }));
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
