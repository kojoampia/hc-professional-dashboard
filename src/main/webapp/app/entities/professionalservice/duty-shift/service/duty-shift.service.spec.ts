import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IDutyShift } from '../duty-shift.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../duty-shift.test-samples';

import { DutyShiftService, RestDutyShift } from './duty-shift.service';

const requireRestSample: RestDutyShift = {
  ...sampleWithRequiredData,
  startsAt: sampleWithRequiredData.startsAt?.toJSON(),
  endsAt: sampleWithRequiredData.endsAt?.toJSON(),
};

describe('DutyShift Service', () => {
  let service: DutyShiftService;
  let httpMock: HttpTestingController;
  let expectedResult: IDutyShift | IDutyShift[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(DutyShiftService);
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

    it('should create a DutyShift', () => {
      const dutyShift = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(dutyShift).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a DutyShift', () => {
      const dutyShift = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(dutyShift).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a DutyShift', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of DutyShift', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a DutyShift', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addDutyShiftToCollectionIfMissing', () => {
      it('should add a DutyShift to an empty array', () => {
        const dutyShift: IDutyShift = sampleWithRequiredData;
        expectedResult = service.addDutyShiftToCollectionIfMissing([], dutyShift);
        expect(expectedResult).toEqual([dutyShift]);
      });

      it('should not add a DutyShift to an array that contains it', () => {
        const dutyShift: IDutyShift = sampleWithRequiredData;
        const dutyShiftCollection: IDutyShift[] = [
          {
            ...dutyShift,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addDutyShiftToCollectionIfMissing(dutyShiftCollection, dutyShift);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a DutyShift to an array that doesn't contain it", () => {
        const dutyShift: IDutyShift = sampleWithRequiredData;
        const dutyShiftCollection: IDutyShift[] = [sampleWithPartialData];
        expectedResult = service.addDutyShiftToCollectionIfMissing(dutyShiftCollection, dutyShift);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(dutyShift);
      });

      it('should add only unique DutyShift to an array', () => {
        const dutyShiftArray: IDutyShift[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const dutyShiftCollection: IDutyShift[] = [sampleWithRequiredData];
        expectedResult = service.addDutyShiftToCollectionIfMissing(dutyShiftCollection, ...dutyShiftArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const dutyShift: IDutyShift = sampleWithRequiredData;
        const dutyShift2: IDutyShift = sampleWithPartialData;
        expectedResult = service.addDutyShiftToCollectionIfMissing([], dutyShift, dutyShift2);
        expect(expectedResult).toEqual([dutyShift, dutyShift2]);
      });

      it('should accept null and undefined values', () => {
        const dutyShift: IDutyShift = sampleWithRequiredData;
        expectedResult = service.addDutyShiftToCollectionIfMissing([], null, dutyShift, undefined);
        expect(expectedResult).toEqual([dutyShift]);
      });

      it('should return initial array if no DutyShift is added', () => {
        const dutyShiftCollection: IDutyShift[] = [sampleWithRequiredData];
        expectedResult = service.addDutyShiftToCollectionIfMissing(dutyShiftCollection, undefined, null);
        expect(expectedResult).toEqual(dutyShiftCollection);
      });
    });

    describe('compareDutyShift', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareDutyShift(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 'd8cc536f-4a6d-4219-87bf-9b74ed67c4f6' };
        const entity2 = null;

        const compareResult1 = service.compareDutyShift(entity1, entity2);
        const compareResult2 = service.compareDutyShift(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 'd8cc536f-4a6d-4219-87bf-9b74ed67c4f6' };
        const entity2 = { id: '5443a25c-9a48-49e8-b45b-70616c4edc8f' };

        const compareResult1 = service.compareDutyShift(entity1, entity2);
        const compareResult2 = service.compareDutyShift(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 'd8cc536f-4a6d-4219-87bf-9b74ed67c4f6' };
        const entity2 = { id: 'd8cc536f-4a6d-4219-87bf-9b74ed67c4f6' };

        const compareResult1 = service.compareDutyShift(entity1, entity2);
        const compareResult2 = service.compareDutyShift(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
