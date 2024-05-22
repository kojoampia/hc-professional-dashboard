import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { HCPayOptionDetailComponent } from './hc-pay-option-detail.component';

describe('HCPayOption Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HCPayOptionDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: HCPayOptionDetailComponent,
              resolve: { hCPayOption: () => of({ id: 'ABC' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(HCPayOptionDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load hCPayOption on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', HCPayOptionDetailComponent);

      // THEN
      expect(instance.hCPayOption).toEqual(expect.objectContaining({ id: 'ABC' }));
    });
  });
});
