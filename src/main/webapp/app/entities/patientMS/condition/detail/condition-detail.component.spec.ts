import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ConditionDetailComponent } from './condition-detail.component';

describe('Condition Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConditionDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: ConditionDetailComponent,
              resolve: { condition: () => of({ id: 'ABC' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(ConditionDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load condition on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', ConditionDetailComponent);

      // THEN
      expect(instance.condition).toEqual(expect.objectContaining({ id: 'ABC' }));
    });
  });
});
