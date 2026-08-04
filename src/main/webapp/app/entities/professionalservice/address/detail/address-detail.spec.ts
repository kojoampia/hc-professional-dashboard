import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AddressDetailComponent } from './address-detail';

// SKIPPED: needs the Angular 20 TestBed.tick() API for httpResource-backed components.
// See scripts/postprocess-generated-entities.mjs and refactor-plan.md.
describe.skip('Address Management Detail Component', () => {
  let comp: AddressDetailComponent;
  let fixture: ComponentFixture<AddressDetailComponent>;

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
              loadComponent: () => import('./address-detail').then(m => m.AddressDetailComponent),
              resolve: { address: () => of({ id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddressDetailComponent);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load address on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', AddressDetailComponent);

      // THEN
      expect(instance.address()).toEqual(expect.objectContaining({ id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' }));
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
