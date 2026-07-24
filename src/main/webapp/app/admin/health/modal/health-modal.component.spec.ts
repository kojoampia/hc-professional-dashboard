import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';

import HealthModalComponent from './health-modal.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('HealthModalComponent', () => {
  let comp: HealthModalComponent;
  let fixture: ComponentFixture<HealthModalComponent>;
  let mockDialogRef: MatDialogRef<HealthModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HealthModalComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close: jest.fn() } },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    })
      .overrideTemplate(HealthModalComponent, '')
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HealthModalComponent);
    comp = fixture.componentInstance;
    mockDialogRef = TestBed.inject(MatDialogRef);
  });

  describe('readableValue', () => {
    it('should return stringify value', () => {
      // GIVEN
      comp.health = undefined;

      // WHEN
      const result = comp.readableValue({ name: 'jhipster' });

      // THEN
      expect(result).toEqual('{"name":"jhipster"}');
    });

    it('should return string value', () => {
      // GIVEN
      comp.health = undefined;

      // WHEN
      const result = comp.readableValue('jhipster');

      // THEN
      expect(result).toEqual('jhipster');
    });

    it('should return storage space in an human readable unit (GB)', () => {
      // GIVEN
      comp.health = {
        key: 'diskSpace',
        value: {
          status: 'UP',
        },
      };

      // WHEN
      const result = comp.readableValue(1073741825);

      // THEN
      expect(result).toEqual('1.00 GB');
    });

    it('should return storage space in an human readable unit (MB)', () => {
      // GIVEN
      comp.health = {
        key: 'diskSpace',
        value: {
          status: 'UP',
        },
      };

      // WHEN
      const result = comp.readableValue(1073741824);

      // THEN
      expect(result).toEqual('1024.00 MB');
    });

    it('should return string value', () => {
      // GIVEN
      comp.health = {
        key: 'mail',
        value: {
          status: 'UP',
        },
      };

      // WHEN
      const result = comp.readableValue(1234);

      // THEN
      expect(result).toEqual('1234');
    });
  });

  describe('dismiss', () => {
    it('should call close when dismiss is called', () => {
      // WHEN
      comp.dismiss();

      // THEN
      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });
});
