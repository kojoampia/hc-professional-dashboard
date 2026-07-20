import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ProfileDetail } from './profile-detail';

describe('Profile Management Detail Component', () => {
  let comp: ProfileDetail;
  let fixture: ComponentFixture<ProfileDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./profile-detail').then(m => m.ProfileDetail),
              resolve: { profile: () => of({ id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faArrowLeft);
    library.addIcons(faPencilAlt);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load profile on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', ProfileDetail);

      // THEN
      expect(instance.profile()).toEqual(expect.objectContaining({ id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' }));
    });
  });

  describe('PreviousState', () => {
    it('should navigate to previous state', () => {
      vitest.spyOn(globalThis.history, 'back');
      comp.previousState();
      expect(globalThis.history.back).toHaveBeenCalled();
    });
  });
});
