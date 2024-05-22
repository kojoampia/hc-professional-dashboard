import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { AddressDetailComponent } from './address-detail.component';

describe('Address Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddressDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: AddressDetailComponent,
              resolve: { address: () => of({ id: 'ABC' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(AddressDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load address on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', AddressDetailComponent);

      // THEN
      expect(instance.address).toEqual(expect.objectContaining({ id: 'ABC' }));
    });
  });
});
