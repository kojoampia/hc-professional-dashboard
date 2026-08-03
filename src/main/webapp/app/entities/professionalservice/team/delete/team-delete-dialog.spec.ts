import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { TeamService } from '../service/team.service';

import { TeamDeleteDialogComponent } from './team-delete-dialog';

describe('Team Management Delete Component', () => {
  let comp: TeamDeleteDialogComponent;
  let fixture: ComponentFixture<TeamDeleteDialogComponent>;
  let service: TeamService;
  let mockActiveModal: MatDialogRef<unknown>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialogRef, useValue: { close: jest.fn() } }],
    });
    fixture = TestBed.createComponent(TeamDeleteDialogComponent);
    comp = fixture.componentInstance;
    service = TestBed.inject(TeamService);
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
