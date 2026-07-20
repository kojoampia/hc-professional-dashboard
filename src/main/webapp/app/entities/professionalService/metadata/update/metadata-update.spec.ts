import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IMetadata } from '../metadata.model';
import { MetadataService } from '../service/metadata.service';

import { MetadataFormService } from './metadata-form.service';
import { MetadataUpdate } from './metadata-update';

describe('Metadata Management Update Component', () => {
  let comp: MetadataUpdate;
  let fixture: ComponentFixture<MetadataUpdate>;
  let activatedRoute: ActivatedRoute;
  let metadataFormService: MetadataFormService;
  let metadataService: MetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: from([{}]),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(MetadataUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    metadataFormService = TestBed.inject(MetadataFormService);
    metadataService = TestBed.inject(MetadataService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const metadata: IMetadata = { id: '7c8cb81a-eae2-4ec8-91d4-a5a5ec343fa8' };

      activatedRoute.data = of({ metadata });
      comp.ngOnInit();

      expect(comp.metadata).toEqual(metadata);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IMetadata>();
      const metadata = { id: '0eb823cb-eb27-4d44-a3a2-5ae4a3acb025' };
      vitest.spyOn(metadataFormService, 'getMetadata').mockReturnValue(metadata);
      vitest.spyOn(metadataService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ metadata });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(metadata);
      saveSubject.complete();

      // THEN
      expect(metadataFormService.getMetadata).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(metadataService.update).toHaveBeenCalledWith(expect.objectContaining(metadata));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IMetadata>();
      const metadata = { id: '0eb823cb-eb27-4d44-a3a2-5ae4a3acb025' };
      vitest.spyOn(metadataFormService, 'getMetadata').mockReturnValue({ id: null });
      vitest.spyOn(metadataService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ metadata: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(metadata);
      saveSubject.complete();

      // THEN
      expect(metadataFormService.getMetadata).toHaveBeenCalled();
      expect(metadataService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IMetadata>();
      const metadata = { id: '0eb823cb-eb27-4d44-a3a2-5ae4a3acb025' };
      vitest.spyOn(metadataService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ metadata });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(metadataService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
