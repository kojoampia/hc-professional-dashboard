import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IMedCase } from '../med-case.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../med-case.test-samples';

import { MedCaseService, RestMedCase } from './med-case.service';

const requireRestSample: RestMedCase = {
  ...sampleWithRequiredData,
  createdDate: sampleWithRequiredData.createdDate?.toJSON(),
  modifiedDate: sampleWithRequiredData.modifiedDate?.toJSON(),
};

describe('MedCase Service', () => {
  let service: MedCaseService;
  let httpMock: HttpTestingController;
  let expectedResult: IMedCase | IMedCase[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(MedCaseService);
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

    it('should create a MedCase', () => {
      const medCase = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(medCase).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a MedCase', () => {
      const medCase = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(medCase).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a MedCase', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of MedCase', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a MedCase', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addMedCaseToCollectionIfMissing', () => {
      it('should add a MedCase to an empty array', () => {
        const medCase: IMedCase = sampleWithRequiredData;
        expectedResult = service.addMedCaseToCollectionIfMissing([], medCase);
        expect(expectedResult).toEqual([medCase]);
      });

      it('should not add a MedCase to an array that contains it', () => {
        const medCase: IMedCase = sampleWithRequiredData;
        const medCaseCollection: IMedCase[] = [
          {
            ...medCase,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addMedCaseToCollectionIfMissing(medCaseCollection, medCase);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a MedCase to an array that doesn't contain it", () => {
        const medCase: IMedCase = sampleWithRequiredData;
        const medCaseCollection: IMedCase[] = [sampleWithPartialData];
        expectedResult = service.addMedCaseToCollectionIfMissing(medCaseCollection, medCase);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(medCase);
      });

      it('should add only unique MedCase to an array', () => {
        const medCaseArray: IMedCase[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const medCaseCollection: IMedCase[] = [sampleWithRequiredData];
        expectedResult = service.addMedCaseToCollectionIfMissing(medCaseCollection, ...medCaseArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const medCase: IMedCase = sampleWithRequiredData;
        const medCase2: IMedCase = sampleWithPartialData;
        expectedResult = service.addMedCaseToCollectionIfMissing([], medCase, medCase2);
        expect(expectedResult).toEqual([medCase, medCase2]);
      });

      it('should accept null and undefined values', () => {
        const medCase: IMedCase = sampleWithRequiredData;
        expectedResult = service.addMedCaseToCollectionIfMissing([], null, medCase, undefined);
        expect(expectedResult).toEqual([medCase]);
      });

      it('should return initial array if no MedCase is added', () => {
        const medCaseCollection: IMedCase[] = [sampleWithRequiredData];
        expectedResult = service.addMedCaseToCollectionIfMissing(medCaseCollection, undefined, null);
        expect(expectedResult).toEqual(medCaseCollection);
      });
    });

    describe('compareMedCase', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareMedCase(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' };
        const entity2 = null;

        const compareResult1 = service.compareMedCase(entity1, entity2);
        const compareResult2 = service.compareMedCase(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' };
        const entity2 = { id: '26c32ccf-3c7c-40ba-92db-700b8a3158a6' };

        const compareResult1 = service.compareMedCase(entity1, entity2);
        const compareResult2 = service.compareMedCase(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' };
        const entity2 = { id: 'f2ae14ac-93d1-47d4-a951-4a936fcd9292' };

        const compareResult1 = service.compareMedCase(entity1, entity2);
        const compareResult2 = service.compareMedCase(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
