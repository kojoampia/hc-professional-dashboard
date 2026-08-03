import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ClinicalReportService } from '../service/clinical-report.service';

import { ClinicalReportDeleteDialogComponent } from './clinical-report-delete-dialog';

describe('ClinicalReport Management Delete Component', () => {
  let comp: ClinicalReportDeleteDialogComponent;
  let fixture: ComponentFixture<ClinicalReportDeleteDialogComponent>;
  let service: ClinicalReportService;
  let mockActiveModal: MatDialogRef<unknown>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialogRef, useValue: { close: jest.fn() } }],
    });
    fixture = TestBed.createComponent(ClinicalReportDeleteDialogComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(ClinicalReportService);
    mockActiveModal = TestBed.inject(MatDialogRef);
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

      // WHEN
      comp.cancel();

      // THEN
      expect(service.delete).not.toHaveBeenCalled();
      expect(mockActiveModal.close).toHaveBeenCalled();
    });
  });
});
