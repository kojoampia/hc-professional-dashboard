import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Subject, from, of } from 'rxjs';

import { IAddress } from '../address.model';
import { AddressService } from '../service/address.service';

import { AddressFormService } from './address-form.service';
import { AddressUpdate } from './address-update';

describe('Address Management Update Component', () => {
  let comp: AddressUpdate;
  let fixture: ComponentFixture<AddressUpdate>;
  let activatedRoute: ActivatedRoute;
  let addressFormService: AddressFormService;
  let addressService: AddressService;

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

    fixture = TestBed.createComponent(AddressUpdate);
    activatedRoute = TestBed.inject(ActivatedRoute);
    addressFormService = TestBed.inject(AddressFormService);
    addressService = TestBed.inject(AddressService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should update editForm', () => {
      const address: IAddress = { id: '1e8b2d0e-a55f-4f49-bda6-466ca50fc308' };

      activatedRoute.data = of({ address });
      comp.ngOnInit();

      expect(comp.address).toEqual(address);
    });
  });

  describe('save', () => {
    it('should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<IAddress>();
      const address = { id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' };
      vitest.spyOn(addressFormService, 'getAddress').mockReturnValue(address);
      vitest.spyOn(addressService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ address });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(address);
      saveSubject.complete();

      // THEN
      expect(addressFormService.getAddress).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(addressService.update).toHaveBeenCalledWith(expect.objectContaining(address));
      expect(comp.isSaving()).toEqual(false);
    });

    it('should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<IAddress>();
      const address = { id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' };
      vitest.spyOn(addressFormService, 'getAddress').mockReturnValue({ id: null });
      vitest.spyOn(addressService, 'create').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ address: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.next(address);
      saveSubject.complete();

      // THEN
      expect(addressFormService.getAddress).toHaveBeenCalled();
      expect(addressService.create).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<IAddress>();
      const address = { id: '1976e7b1-8233-4a09-bdb3-fbe559c0d8c2' };
      vitest.spyOn(addressService, 'update').mockReturnValue(saveSubject);
      vitest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ address });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving()).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(addressService.update).toHaveBeenCalled();
      expect(comp.isSaving()).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });
});
