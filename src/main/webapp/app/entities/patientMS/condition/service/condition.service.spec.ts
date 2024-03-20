import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { ICondition } from '../condition.model';
import { sampleWithRequiredData, sampleWithNewData, sampleWithPartialData, sampleWithFullData } from '../condition.test-samples';

import { ConditionService, RestCondition } from './condition.service';

const requireRestSample: RestCondition = {
  ...sampleWithRequiredData,
  createdDate: sampleWithRequiredData.createdDate?.format(DATE_FORMAT),
  modifiedDate: sampleWithRequiredData.modifiedDate?.format(DATE_FORMAT),
};

describe('Condition Service', () => {
  let service: ConditionService;
  let httpMock: HttpTestingController;
  let expectedResult: ICondition | ICondition[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    expectedResult = null;
    service = TestBed.inject(ConditionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  describe('Service methods', () => {
    it('should find an element', () => {
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.find('ABC').subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should create a Condition', () => {
      const condition = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(condition).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Condition', () => {
      const condition = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(condition).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Condition', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Condition', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Condition', () => {
      const expected = true;

      service.delete('ABC').subscribe(resp => (expectedResult = resp.ok));

      const req = httpMock.expectOne({ method: 'DELETE' });
      req.flush({ status: 200 });
      expect(expectedResult).toBe(expected);
    });

    it('should handle exceptions for searching a Condition', () => {
      const queryObject: any = {
        page: 0,
        size: 20,
        query: '',
        sort: [],
      };
      service.search(queryObject).subscribe(() => expectedResult);

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });
      expect(expectedResult).toBe(null);
    });

    describe('addConditionToCollectionIfMissing', () => {
      it('should add a Condition to an empty array', () => {
        const condition: ICondition = sampleWithRequiredData;
        expectedResult = service.addConditionToCollectionIfMissing([], condition);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(condition);
      });

      it('should not add a Condition to an array that contains it', () => {
        const condition: ICondition = sampleWithRequiredData;
        const conditionCollection: ICondition[] = [
          {
            ...condition,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addConditionToCollectionIfMissing(conditionCollection, condition);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Condition to an array that doesn't contain it", () => {
        const condition: ICondition = sampleWithRequiredData;
        const conditionCollection: ICondition[] = [sampleWithPartialData];
        expectedResult = service.addConditionToCollectionIfMissing(conditionCollection, condition);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(condition);
      });

      it('should add only unique Condition to an array', () => {
        const conditionArray: ICondition[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const conditionCollection: ICondition[] = [sampleWithRequiredData];
        expectedResult = service.addConditionToCollectionIfMissing(conditionCollection, ...conditionArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const condition: ICondition = sampleWithRequiredData;
        const condition2: ICondition = sampleWithPartialData;
        expectedResult = service.addConditionToCollectionIfMissing([], condition, condition2);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(condition);
        expect(expectedResult).toContain(condition2);
      });

      it('should accept null and undefined values', () => {
        const condition: ICondition = sampleWithRequiredData;
        expectedResult = service.addConditionToCollectionIfMissing([], null, condition, undefined);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(condition);
      });

      it('should return initial array if no Condition is added', () => {
        const conditionCollection: ICondition[] = [sampleWithRequiredData];
        expectedResult = service.addConditionToCollectionIfMissing(conditionCollection, undefined, null);
        expect(expectedResult).toEqual(conditionCollection);
      });
    });

    describe('compareCondition', () => {
      it('Should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareCondition(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('Should return false if one entity is null', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = null;

        const compareResult1 = service.compareCondition(entity1, entity2);
        const compareResult2 = service.compareCondition(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey differs', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = { id: 'CBA' };

        const compareResult1 = service.compareCondition(entity1, entity2);
        const compareResult2 = service.compareCondition(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey matches', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = { id: 'ABC' };

        const compareResult1 = service.compareCondition(entity1, entity2);
        const compareResult2 = service.compareCondition(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
