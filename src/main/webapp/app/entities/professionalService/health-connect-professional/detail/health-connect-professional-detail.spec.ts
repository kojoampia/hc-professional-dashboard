import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { HealthConnectProfessionalDetailComponent } from './health-connect-professional-detail';

// SKIPPED: needs the Angular 20 TestBed.tick() API for httpResource-backed components.
// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.
describe.skip('HealthConnectProfessional Management Detail Component', () => {
  let comp: HealthConnectProfessionalDetailComponent;
  let fixture: ComponentFixture<HealthConnectProfessionalDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), MatIconModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), 
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./health-connect-professional-detail').then(m => m.HealthConnectProfessionalDetailComponent),
              resolve: { healthConnectProfessional: () => of({ id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HealthConnectProfessionalDetailComponent);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load healthConnectProfessional on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', HealthConnectProfessionalDetailComponent);

      // THEN
      expect(instance.healthConnectProfessional()).toEqual(expect.objectContaining({ id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' }));
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
