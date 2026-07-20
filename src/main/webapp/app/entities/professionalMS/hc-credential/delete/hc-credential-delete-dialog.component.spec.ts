jest.mock('@ng-bootstrap/ng-bootstrap');

import { ComponentFixture, TestBed, inject, fakeAsync, tick } from '@angular/core/testing';
import { HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { HCCredentialService } from '../service/hc-credential.service';

import { HCCredentialDeleteDialogComponent } from './hc-credential-delete-dialog.component';

describe('HCCredential Management Delete Component', () => {
  let comp: HCCredentialDeleteDialogComponent;
  let fixture: ComponentFixture<HCCredentialDeleteDialogComponent>;
  let service: HCCredentialService;
  let mockActiveModal: NgbActiveModal;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HCCredentialDeleteDialogComponent],
      providers: [NgbActiveModal, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideTemplate(HCCredentialDeleteDialogComponent, '')
      .compileComponents();
    fixture = TestBed.createComponent(HCCredentialDeleteDialogComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(HCCredentialService);
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
