import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { MembershipDetailComponent } from './membership-detail.component';

describe('Membership Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembershipDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: MembershipDetailComponent,
              resolve: { membership: () => of({ id: 'ABC' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(MembershipDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load membership on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', MembershipDetailComponent);

      // THEN
      expect(instance.membership).toEqual(expect.objectContaining({ id: 'ABC' }));
    });
  });
});
