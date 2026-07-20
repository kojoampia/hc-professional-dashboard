import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { HCCredentialDetailComponent } from './hc-credential-detail.component';

describe('HCCredential Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HCCredentialDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: HCCredentialDetailComponent,
              resolve: { hCCredential: () => of({ id: 'ABC' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(HCCredentialDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load hCCredential on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', HCCredentialDetailComponent);

      // THEN
      expect(instance.hCCredential).toEqual(expect.objectContaining({ id: 'ABC' }));
    });
  });
});
