import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IDutyRoster } from '../duty-roster.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../duty-roster.test-samples';

import { DutyRosterService } from './duty-roster.service';

const requireRestSample: IDutyRoster = {
  ...sampleWithRequiredData,
};

describe('DutyRoster Service', () => {
  let service: DutyRosterService;
  let httpMock: HttpTestingController;
  let expectedResult: IDutyRoster | IDutyRoster[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(DutyRosterService);
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

    it('should create a DutyRoster', () => {
      const dutyRoster = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(dutyRoster).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a DutyRoster', () => {
      const dutyRoster = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(dutyRoster).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a DutyRoster', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of DutyRoster', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a DutyRoster', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addDutyRosterToCollectionIfMissing', () => {
      it('should add a DutyRoster to an empty array', () => {
        const dutyRoster: IDutyRoster = sampleWithRequiredData;
        expectedResult = service.addDutyRosterToCollectionIfMissing([], dutyRoster);
        expect(expectedResult).toEqual([dutyRoster]);
      });

      it('should not add a DutyRoster to an array that contains it', () => {
        const dutyRoster: IDutyRoster = sampleWithRequiredData;
        const dutyRosterCollection: IDutyRoster[] = [
          {
            ...dutyRoster,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addDutyRosterToCollectionIfMissing(dutyRosterCollection, dutyRoster);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a DutyRoster to an array that doesn't contain it", () => {
        const dutyRoster: IDutyRoster = sampleWithRequiredData;
        const dutyRosterCollection: IDutyRoster[] = [sampleWithPartialData];
        expectedResult = service.addDutyRosterToCollectionIfMissing(dutyRosterCollection, dutyRoster);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(dutyRoster);
      });

      it('should add only unique DutyRoster to an array', () => {
        const dutyRosterArray: IDutyRoster[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const dutyRosterCollection: IDutyRoster[] = [sampleWithRequiredData];
        expectedResult = service.addDutyRosterToCollectionIfMissing(dutyRosterCollection, ...dutyRosterArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const dutyRoster: IDutyRoster = sampleWithRequiredData;
        const dutyRoster2: IDutyRoster = sampleWithPartialData;
        expectedResult = service.addDutyRosterToCollectionIfMissing([], dutyRoster, dutyRoster2);
        expect(expectedResult).toEqual([dutyRoster, dutyRoster2]);
      });

      it('should accept null and undefined values', () => {
        const dutyRoster: IDutyRoster = sampleWithRequiredData;
        expectedResult = service.addDutyRosterToCollectionIfMissing([], null, dutyRoster, undefined);
        expect(expectedResult).toEqual([dutyRoster]);
      });

      it('should return initial array if no DutyRoster is added', () => {
        const dutyRosterCollection: IDutyRoster[] = [sampleWithRequiredData];
        expectedResult = service.addDutyRosterToCollectionIfMissing(dutyRosterCollection, undefined, null);
        expect(expectedResult).toEqual(dutyRosterCollection);
      });
    });

    describe('compareDutyRoster', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareDutyRoster(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: '401a8b55-3dcb-46fc-bb91-cbfc48b18166' };
        const entity2 = null;

        const compareResult1 = service.compareDutyRoster(entity1, entity2);
        const compareResult2 = service.compareDutyRoster(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: '401a8b55-3dcb-46fc-bb91-cbfc48b18166' };
        const entity2 = { id: '86672097-b936-40af-b843-9a360e5aa112' };

        const compareResult1 = service.compareDutyRoster(entity1, entity2);
        const compareResult2 = service.compareDutyRoster(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: '401a8b55-3dcb-46fc-bb91-cbfc48b18166' };
        const entity2 = { id: '401a8b55-3dcb-46fc-bb91-cbfc48b18166' };

        const compareResult1 = service.compareDutyRoster(entity1, entity2);
        const compareResult2 = service.compareDutyRoster(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
