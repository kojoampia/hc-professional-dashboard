jest.mock('@ng-bootstrap/ng-bootstrap');

import { ComponentFixture, TestBed, inject, fakeAsync, tick } from '@angular/core/testing';
import { HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { HCPayOptionService } from '../service/hc-pay-option.service';

import { HCPayOptionDeleteDialogComponent } from './hc-pay-option-delete-dialog.component';

describe('HCPayOption Management Delete Component', () => {
  let comp: HCPayOptionDeleteDialogComponent;
  let fixture: ComponentFixture<HCPayOptionDeleteDialogComponent>;
  let service: HCPayOptionService;
  let mockActiveModal: NgbActiveModal;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [HCPayOptionDeleteDialogComponent],
    providers: [NgbActiveModal, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
      .overrideTemplate(HCPayOptionDeleteDialogComponent, '')
      .compileComponents();
    fixture = TestBed.createComponent(HCPayOptionDeleteDialogComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(HCPayOptionService);
    mockActiveModal = TestBed.inject(NgbActiveModal);
  });

  describe('confirmDelete', () => {
    it('Should call delete service on confirmDelete', inject(
      [],
      fakeAsync(() => {
        // GIVEN
        jest.spyOn(service, 'delete').mockReturnValue(of(new HttpResponse({ body: {} })));

        // WHEN
        comp.confirmDelete('ABC');
        tick();

        // THEN
        expect(service.delete).toHaveBeenCalledWith('ABC');
        expect(mockActiveModal.close).toHaveBeenCalledWith('deleted');
      }),
    ));

    it('Should not call delete service on clear', () => {
      // GIVEN
      jest.spyOn(service, 'delete');

      // WHEN
      comp.cancel();

      // THEN
      expect(service.delete).not.toHaveBeenCalled();
      expect(mockActiveModal.close).not.toHaveBeenCalled();
      expect(mockActiveModal.dismiss).toHaveBeenCalled();
    });
  });
});
