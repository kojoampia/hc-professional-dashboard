import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { MetadataDetailComponent } from './metadata-detail.component';

describe('Metadata Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetadataDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: MetadataDetailComponent,
              resolve: { metadata: () => of({ id: 'ABC' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(MetadataDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load metadata on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', MetadataDetailComponent);

      // THEN
      expect(instance.metadata).toEqual(expect.objectContaining({ id: 'ABC' }));
    });
  });
});
