import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { MedCaseService } from '../service/med-case.service';

import { MedCaseDeleteDialogComponent } from './med-case-delete-dialog';

describe('MedCase Management Delete Component', () => {
  let comp: MedCaseDeleteDialogComponent;
  let fixture: ComponentFixture<MedCaseDeleteDialogComponent>;
  let service: MedCaseService;
  let mockDialogRef: MatDialogRef<MedCaseDeleteDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialogRef, useValue: { close: jest.fn() } }],
    });
    fixture = TestBed.createComponent(MedCaseDeleteDialogComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(MedCaseService);
    mockDialogRef = TestBed.inject(MatDialogRef);
  });

  describe('confirmDelete', () => {
    it('should call delete service on confirmDelete', () => {
      // GIVEN
      jest.spyOn(service, 'delete').mockReturnValue(of(undefined));

      // WHEN
      comp.confirmDelete('ABC');

      // THEN
      expect(service.delete).toHaveBeenCalledWith('ABC');
      expect(mockDialogRef.close).toHaveBeenCalledWith('deleted');
    });

    it('should not call delete service on clear', () => {
      // GIVEN
      jest.spyOn(service, 'delete');

      // WHEN
      comp.cancel();

      // THEN
      expect(service.delete).not.toHaveBeenCalled();
      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });
  });
});
