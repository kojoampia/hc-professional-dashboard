import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { MedicationDetailComponent } from './medication-detail.component';

describe('Medication Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicationDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: MedicationDetailComponent,
              resolve: { medication: () => of({ id: 'ABC' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(MedicationDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load medication on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', MedicationDetailComponent);

      // THEN
      expect(instance.medication).toEqual(expect.objectContaining({ id: 'ABC' }));
    });
  });
});
