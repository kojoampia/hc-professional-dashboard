import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { StatDetailComponent } from './stat-detail.component';

describe('Stat Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: StatDetailComponent,
              resolve: { stat: () => of({ id: 'ABC' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(StatDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load stat on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', StatDetailComponent);

      // THEN
      expect(instance.stat).toEqual(expect.objectContaining({ id: 'ABC' }));
    });
  });
});
