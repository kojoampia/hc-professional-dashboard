import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LogsService } from './logs.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Logs Service', () => {
  let service: LogsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});

    service = TestBed.inject(LogsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service methods', () => {
    it('should change log level', () => {
      service.changeLevel('main', 'ERROR').subscribe();

      const req = httpMock.expectOne({ method: 'POST' });
      expect(req.request.body).toEqual({ configuredLevel: 'ERROR' });
    });
  });
});
