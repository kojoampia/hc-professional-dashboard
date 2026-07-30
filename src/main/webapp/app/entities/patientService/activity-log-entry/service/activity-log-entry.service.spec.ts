import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IActivityLogEntry } from '../activity-log-entry.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../activity-log-entry.test-samples';

import { ActivityLogEntryService, RestActivityLogEntry } from './activity-log-entry.service';

const requireRestSample: RestActivityLogEntry = {
  ...sampleWithRequiredData,
  occurredAt: sampleWithRequiredData.occurredAt?.toJSON(),
  createdAt: sampleWithRequiredData.createdAt?.toJSON(),
};

describe('ActivityLogEntry Service', () => {
  let service: ActivityLogEntryService;
  let httpMock: HttpTestingController;
  let expectedResult: IActivityLogEntry | IActivityLogEntry[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(ActivityLogEntryService);
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

    it('should create a ActivityLogEntry', () => {
      const activityLogEntry = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(activityLogEntry).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a ActivityLogEntry', () => {
      const activityLogEntry = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(activityLogEntry).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a ActivityLogEntry', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of ActivityLogEntry', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a ActivityLogEntry', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addActivityLogEntryToCollectionIfMissing', () => {
      it('should add a ActivityLogEntry to an empty array', () => {
        const activityLogEntry: IActivityLogEntry = sampleWithRequiredData;
        expectedResult = service.addActivityLogEntryToCollectionIfMissing([], activityLogEntry);
        expect(expectedResult).toEqual([activityLogEntry]);
      });

      it('should not add a ActivityLogEntry to an array that contains it', () => {
        const activityLogEntry: IActivityLogEntry = sampleWithRequiredData;
        const activityLogEntryCollection: IActivityLogEntry[] = [
          {
            ...activityLogEntry,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addActivityLogEntryToCollectionIfMissing(activityLogEntryCollection, activityLogEntry);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a ActivityLogEntry to an array that doesn't contain it", () => {
        const activityLogEntry: IActivityLogEntry = sampleWithRequiredData;
        const activityLogEntryCollection: IActivityLogEntry[] = [sampleWithPartialData];
        expectedResult = service.addActivityLogEntryToCollectionIfMissing(activityLogEntryCollection, activityLogEntry);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(activityLogEntry);
      });

      it('should add only unique ActivityLogEntry to an array', () => {
        const activityLogEntryArray: IActivityLogEntry[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const activityLogEntryCollection: IActivityLogEntry[] = [sampleWithRequiredData];
        expectedResult = service.addActivityLogEntryToCollectionIfMissing(activityLogEntryCollection, ...activityLogEntryArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const activityLogEntry: IActivityLogEntry = sampleWithRequiredData;
        const activityLogEntry2: IActivityLogEntry = sampleWithPartialData;
        expectedResult = service.addActivityLogEntryToCollectionIfMissing([], activityLogEntry, activityLogEntry2);
        expect(expectedResult).toEqual([activityLogEntry, activityLogEntry2]);
      });

      it('should accept null and undefined values', () => {
        const activityLogEntry: IActivityLogEntry = sampleWithRequiredData;
        expectedResult = service.addActivityLogEntryToCollectionIfMissing([], null, activityLogEntry, undefined);
        expect(expectedResult).toEqual([activityLogEntry]);
      });

      it('should return initial array if no ActivityLogEntry is added', () => {
        const activityLogEntryCollection: IActivityLogEntry[] = [sampleWithRequiredData];
        expectedResult = service.addActivityLogEntryToCollectionIfMissing(activityLogEntryCollection, undefined, null);
        expect(expectedResult).toEqual(activityLogEntryCollection);
      });
    });

    describe('compareActivityLogEntry', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareActivityLogEntry(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 'c9da8b1f-a382-46b2-8e36-4b0c64a54086' };
        const entity2 = null;

        const compareResult1 = service.compareActivityLogEntry(entity1, entity2);
        const compareResult2 = service.compareActivityLogEntry(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 'c9da8b1f-a382-46b2-8e36-4b0c64a54086' };
        const entity2 = { id: '362a7f42-2650-4a82-82a8-0ce5fdd9aa97' };

        const compareResult1 = service.compareActivityLogEntry(entity1, entity2);
        const compareResult2 = service.compareActivityLogEntry(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 'c9da8b1f-a382-46b2-8e36-4b0c64a54086' };
        const entity2 = { id: 'c9da8b1f-a382-46b2-8e36-4b0c64a54086' };

        const compareResult1 = service.compareActivityLogEntry(entity1, entity2);
        const compareResult2 = service.compareActivityLogEntry(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
