import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ActivatedRouteSnapshot, Router, convertToParamMap } from '@angular/router';

import { lastValueFrom, of, throwError } from 'rxjs';

import { ReportService } from '../service/report.service';

import reportResolve from './report-routing-resolve.service';

describe('Report routing resolve service', () => {
  let mockRouter: Router;
  let mockActivatedRouteSnapshot: ActivatedRouteSnapshot;
  let service: ReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), 
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
            },
          },
        },
      ],
    });
    mockRouter = TestBed.inject(Router);
    jest.spyOn(mockRouter, 'navigate');
    mockActivatedRouteSnapshot = TestBed.inject(ActivatedRoute).snapshot;
    service = TestBed.inject(ReportService);
  });

  describe('resolve', () => {
    it('should return IReport returned by find', async () => {
      // GIVEN
      service.find = jest.fn(id => of({ id }));
      mockActivatedRouteSnapshot.params = { id: 'ABC' };

      // WHEN
      await new Promise<void>(resolve => {
        TestBed.runInInjectionContext(() => {
          reportResolve(mockActivatedRouteSnapshot).subscribe({
            next(result) {
              // THEN
              expect(service.find).toHaveBeenCalledWith('ABC');
              expect(result).toEqual({ id: 'ABC' });
              resolve();
            },
          });
        });
      });
    });

    it('should return null if id is not provided', async () => {
      // GIVEN
      service.find = jest.fn();
      mockActivatedRouteSnapshot.params = {};

      // WHEN
      await new Promise<void>(resolve => {
        TestBed.runInInjectionContext(() => {
          reportResolve(mockActivatedRouteSnapshot).subscribe({
            next(result) {
              // THEN
              expect(service.find).not.toHaveBeenCalled();
              expect(result).toEqual(null);
              resolve();
            },
          });
        });
      });
    });

    it('should route to 404 page if data not found in server', async () => {
      // GIVEN
      jest.spyOn(service, 'find').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })));
      mockActivatedRouteSnapshot.params = { id: 'ABC' };

      // WHEN
      await TestBed.runInInjectionContext(async () => {
        await expect(lastValueFrom(reportResolve(mockActivatedRouteSnapshot))).rejects.toThrow('no elements in sequence');
        // THEN
        expect(service.find).toHaveBeenCalledWith('ABC');
        expect(mockRouter.navigate).toHaveBeenCalledWith(['404']);
      });
    });

    it('should route to error page if server returns an error other than 404', async () => {
      // GIVEN
      jest.spyOn(service, 'find')
        .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' })));
      mockActivatedRouteSnapshot.params = { id: 'ABC' };

      // WHEN
      await TestBed.runInInjectionContext(async () => {
        await expect(lastValueFrom(reportResolve(mockActivatedRouteSnapshot))).rejects.toThrow('no elements in sequence');
        // THEN
        expect(service.find).toHaveBeenCalledWith('ABC');
        expect(mockRouter.navigate).toHaveBeenCalledWith(['error']);
      });
    });
  });
});
