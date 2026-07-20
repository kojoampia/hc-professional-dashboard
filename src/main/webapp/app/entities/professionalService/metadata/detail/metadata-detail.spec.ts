import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { MetadataDetail } from './metadata-detail';

describe('Metadata Management Detail Component', () => {
  let comp: MetadataDetail;
  let fixture: ComponentFixture<MetadataDetail>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              loadComponent: () => import('./metadata-detail').then(m => m.MetadataDetail),
              resolve: { metadata: () => of({ id: '0eb823cb-eb27-4d44-a3a2-5ae4a3acb025' }) },
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
    fixture = TestBed.createComponent(MetadataDetail);
    comp = fixture.componentInstance;
  });

  describe('OnInit', () => {
    it('should load metadata on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', MetadataDetail);

      // THEN
      expect(instance.metadata()).toEqual(expect.objectContaining({ id: '0eb823cb-eb27-4d44-a3a2-5ae4a3acb025' }));
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
