import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IHealthConnectProfessional } from '../health-connect-professional.model';
import {
  sampleWithFullData,
  sampleWithNewData,
  sampleWithPartialData,
  sampleWithRequiredData,
} from '../health-connect-professional.test-samples';

import { HealthConnectProfessionalService } from './health-connect-professional.service';

const requireRestSample: IHealthConnectProfessional = {
  ...sampleWithRequiredData,
};

describe('HealthConnectProfessional Service', () => {
  let service: HealthConnectProfessionalService;
  let httpMock: HttpTestingController;
  let expectedResult: IHealthConnectProfessional | IHealthConnectProfessional[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(HealthConnectProfessionalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  describe('Service methods', () => {
    it('should find an element', () => {
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.find('ABC').subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should create a HealthConnectProfessional', () => {
      const healthConnectProfessional = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(healthConnectProfessional).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a HealthConnectProfessional', () => {
      const healthConnectProfessional = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(healthConnectProfessional).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a HealthConnectProfessional', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of HealthConnectProfessional', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a HealthConnectProfessional', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addHealthConnectProfessionalToCollectionIfMissing', () => {
      it('should add a HealthConnectProfessional to an empty array', () => {
        const healthConnectProfessional: IHealthConnectProfessional = sampleWithRequiredData;
        expectedResult = service.addHealthConnectProfessionalToCollectionIfMissing([], healthConnectProfessional);
        expect(expectedResult).toEqual([healthConnectProfessional]);
      });

      it('should not add a HealthConnectProfessional to an array that contains it', () => {
        const healthConnectProfessional: IHealthConnectProfessional = sampleWithRequiredData;
        const healthConnectProfessionalCollection: IHealthConnectProfessional[] = [
          {
            ...healthConnectProfessional,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addHealthConnectProfessionalToCollectionIfMissing(
          healthConnectProfessionalCollection,
          healthConnectProfessional,
        );
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a HealthConnectProfessional to an array that doesn't contain it", () => {
        const healthConnectProfessional: IHealthConnectProfessional = sampleWithRequiredData;
        const healthConnectProfessionalCollection: IHealthConnectProfessional[] = [sampleWithPartialData];
        expectedResult = service.addHealthConnectProfessionalToCollectionIfMissing(
          healthConnectProfessionalCollection,
          healthConnectProfessional,
        );
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(healthConnectProfessional);
      });

      it('should add only unique HealthConnectProfessional to an array', () => {
        const healthConnectProfessionalArray: IHealthConnectProfessional[] = [
          sampleWithRequiredData,
          sampleWithPartialData,
          sampleWithFullData,
        ];
        const healthConnectProfessionalCollection: IHealthConnectProfessional[] = [sampleWithRequiredData];
        expectedResult = service.addHealthConnectProfessionalToCollectionIfMissing(
          healthConnectProfessionalCollection,
          ...healthConnectProfessionalArray,
        );
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const healthConnectProfessional: IHealthConnectProfessional = sampleWithRequiredData;
        const healthConnectProfessional2: IHealthConnectProfessional = sampleWithPartialData;
        expectedResult = service.addHealthConnectProfessionalToCollectionIfMissing(
          [],
          healthConnectProfessional,
          healthConnectProfessional2,
        );
        expect(expectedResult).toEqual([healthConnectProfessional, healthConnectProfessional2]);
      });

      it('should accept null and undefined values', () => {
        const healthConnectProfessional: IHealthConnectProfessional = sampleWithRequiredData;
        expectedResult = service.addHealthConnectProfessionalToCollectionIfMissing([], null, healthConnectProfessional, undefined);
        expect(expectedResult).toEqual([healthConnectProfessional]);
      });

      it('should return initial array if no HealthConnectProfessional is added', () => {
        const healthConnectProfessionalCollection: IHealthConnectProfessional[] = [sampleWithRequiredData];
        expectedResult = service.addHealthConnectProfessionalToCollectionIfMissing(healthConnectProfessionalCollection, undefined, null);
        expect(expectedResult).toEqual(healthConnectProfessionalCollection);
      });
    });

    describe('compareHealthConnectProfessional', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareHealthConnectProfessional(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' };
        const entity2 = null;

        const compareResult1 = service.compareHealthConnectProfessional(entity1, entity2);
        const compareResult2 = service.compareHealthConnectProfessional(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' };
        const entity2 = { id: '657f7ab4-8eaa-4fa9-89d3-0d571cfd2bb2' };

        const compareResult1 = service.compareHealthConnectProfessional(entity1, entity2);
        const compareResult2 = service.compareHealthConnectProfessional(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' };
        const entity2 = { id: '1b8b3e61-c30b-4db5-a04a-2f0b313a344d' };

        const compareResult1 = service.compareHealthConnectProfessional(entity1, entity2);
        const compareResult2 = service.compareHealthConnectProfessional(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
