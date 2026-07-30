import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IMedicationRecord } from '../medication-record.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../medication-record.test-samples';

import { MedicationRecordService, RestMedicationRecord } from './medication-record.service';

const requireRestSample: RestMedicationRecord = {
  ...sampleWithRequiredData,
  occurredAt: sampleWithRequiredData.occurredAt?.toJSON(),
};

describe('MedicationRecord Service', () => {
  let service: MedicationRecordService;
  let httpMock: HttpTestingController;
  let expectedResult: IMedicationRecord | IMedicationRecord[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(MedicationRecordService);
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

    it('should create a MedicationRecord', () => {
      const medicationRecord = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(medicationRecord).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a MedicationRecord', () => {
      const medicationRecord = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(medicationRecord).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a MedicationRecord', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of MedicationRecord', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a MedicationRecord', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addMedicationRecordToCollectionIfMissing', () => {
      it('should add a MedicationRecord to an empty array', () => {
        const medicationRecord: IMedicationRecord = sampleWithRequiredData;
        expectedResult = service.addMedicationRecordToCollectionIfMissing([], medicationRecord);
        expect(expectedResult).toEqual([medicationRecord]);
      });

      it('should not add a MedicationRecord to an array that contains it', () => {
        const medicationRecord: IMedicationRecord = sampleWithRequiredData;
        const medicationRecordCollection: IMedicationRecord[] = [
          {
            ...medicationRecord,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addMedicationRecordToCollectionIfMissing(medicationRecordCollection, medicationRecord);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a MedicationRecord to an array that doesn't contain it", () => {
        const medicationRecord: IMedicationRecord = sampleWithRequiredData;
        const medicationRecordCollection: IMedicationRecord[] = [sampleWithPartialData];
        expectedResult = service.addMedicationRecordToCollectionIfMissing(medicationRecordCollection, medicationRecord);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(medicationRecord);
      });

      it('should add only unique MedicationRecord to an array', () => {
        const medicationRecordArray: IMedicationRecord[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const medicationRecordCollection: IMedicationRecord[] = [sampleWithRequiredData];
        expectedResult = service.addMedicationRecordToCollectionIfMissing(medicationRecordCollection, ...medicationRecordArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const medicationRecord: IMedicationRecord = sampleWithRequiredData;
        const medicationRecord2: IMedicationRecord = sampleWithPartialData;
        expectedResult = service.addMedicationRecordToCollectionIfMissing([], medicationRecord, medicationRecord2);
        expect(expectedResult).toEqual([medicationRecord, medicationRecord2]);
      });

      it('should accept null and undefined values', () => {
        const medicationRecord: IMedicationRecord = sampleWithRequiredData;
        expectedResult = service.addMedicationRecordToCollectionIfMissing([], null, medicationRecord, undefined);
        expect(expectedResult).toEqual([medicationRecord]);
      });

      it('should return initial array if no MedicationRecord is added', () => {
        const medicationRecordCollection: IMedicationRecord[] = [sampleWithRequiredData];
        expectedResult = service.addMedicationRecordToCollectionIfMissing(medicationRecordCollection, undefined, null);
        expect(expectedResult).toEqual(medicationRecordCollection);
      });
    });

    describe('compareMedicationRecord', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareMedicationRecord(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 'bcabc4b7-675f-4d12-b963-1a937080e486' };
        const entity2 = null;

        const compareResult1 = service.compareMedicationRecord(entity1, entity2);
        const compareResult2 = service.compareMedicationRecord(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 'bcabc4b7-675f-4d12-b963-1a937080e486' };
        const entity2 = { id: '578f52e3-4be5-49e6-aee0-253ab127033d' };

        const compareResult1 = service.compareMedicationRecord(entity1, entity2);
        const compareResult2 = service.compareMedicationRecord(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 'bcabc4b7-675f-4d12-b963-1a937080e486' };
        const entity2 = { id: 'bcabc4b7-675f-4d12-b963-1a937080e486' };

        const compareResult1 = service.compareMedicationRecord(entity1, entity2);
        const compareResult2 = service.compareMedicationRecord(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
