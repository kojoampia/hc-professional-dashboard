import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ProfileDetailComponent } from './profile-detail.component';

describe('Profile Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: ProfileDetailComponent,
              resolve: { profile: () => of({ id: 'ABC' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(ProfileDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load profile on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', ProfileDetailComponent);

      // THEN
      expect(instance.profile).toEqual(expect.objectContaining({ id: 'ABC' }));
    });
  });
});
