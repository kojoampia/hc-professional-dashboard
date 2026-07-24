import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { MedCaseService } from '../service/med-case.service';

import { MedCaseDeleteDialogComponent } from './med-case-delete-dialog';

describe('MedCase Management Delete Component', () => {
  let comp: MedCaseDeleteDialogComponent;
  let fixture: ComponentFixture<MedCaseDeleteDialogComponent>;
  let service: MedCaseService;
  let mockActiveModal: NgbActiveModal;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NgbActiveModal],
    });
    fixture = TestBed.createComponent(MedCaseDeleteDialogComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(MedCaseService);
    mockActiveModal = TestBed.inject(NgbActiveModal);
  });

  describe('confirmDelete', () => {
    it('should call delete service on confirmDelete', () => {
      // GIVEN
      jest.spyOn(service, 'delete').mockReturnValue(of(undefined));
      jest.spyOn(mockActiveModal, 'close');

      // WHEN
      comp.confirmDelete('ABC');

      // THEN
      expect(service.delete).toHaveBeenCalledWith('ABC');
      expect(mockActiveModal.close).toHaveBeenCalledWith('deleted');
    });

    it('should not call delete service on clear', () => {
      // GIVEN
      jest.spyOn(service, 'delete');
      jest.spyOn(mockActiveModal, 'close');
      jest.spyOn(mockActiveModal, 'dismiss');

      // WHEN
      comp.cancel();

      // THEN
      expect(service.delete).not.toHaveBeenCalled();
      expect(mockActiveModal.close).not.toHaveBeenCalled();
      expect(mockActiveModal.dismiss).toHaveBeenCalled();
    });
  });
});
