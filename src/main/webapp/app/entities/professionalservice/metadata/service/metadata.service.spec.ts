import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IMetadata } from '../metadata.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../metadata.test-samples';

import { MetadataService, RestMetadata } from './metadata.service';

const requireRestSample: RestMetadata = {
  ...sampleWithRequiredData,
  createdDate: sampleWithRequiredData.createdDate?.format(DATE_FORMAT),
  modifiedDate: sampleWithRequiredData.modifiedDate?.format(DATE_FORMAT),
};

describe('Metadata Service', () => {
  let service: MetadataService;
  let httpMock: HttpTestingController;
  let expectedResult: IMetadata | IMetadata[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(MetadataService);
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

    it('should create a Metadata', () => {
      const metadata = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(metadata).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Metadata', () => {
      const metadata = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(metadata).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Metadata', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Metadata', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Metadata', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addMetadataToCollectionIfMissing', () => {
      it('should add a Metadata to an empty array', () => {
        const metadata: IMetadata = sampleWithRequiredData;
        expectedResult = service.addMetadataToCollectionIfMissing([], metadata);
        expect(expectedResult).toEqual([metadata]);
      });

      it('should not add a Metadata to an array that contains it', () => {
        const metadata: IMetadata = sampleWithRequiredData;
        const metadataCollection: IMetadata[] = [
          {
            ...metadata,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addMetadataToCollectionIfMissing(metadataCollection, metadata);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Metadata to an array that doesn't contain it", () => {
        const metadata: IMetadata = sampleWithRequiredData;
        const metadataCollection: IMetadata[] = [sampleWithPartialData];
        expectedResult = service.addMetadataToCollectionIfMissing(metadataCollection, metadata);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(metadata);
      });

      it('should add only unique Metadata to an array', () => {
        const metadataArray: IMetadata[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const metadataCollection: IMetadata[] = [sampleWithRequiredData];
        expectedResult = service.addMetadataToCollectionIfMissing(metadataCollection, ...metadataArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const metadata: IMetadata = sampleWithRequiredData;
        const metadata2: IMetadata = sampleWithPartialData;
        expectedResult = service.addMetadataToCollectionIfMissing([], metadata, metadata2);
        expect(expectedResult).toEqual([metadata, metadata2]);
      });

      it('should accept null and undefined values', () => {
        const metadata: IMetadata = sampleWithRequiredData;
        expectedResult = service.addMetadataToCollectionIfMissing([], null, metadata, undefined);
        expect(expectedResult).toEqual([metadata]);
      });

      it('should return initial array if no Metadata is added', () => {
        const metadataCollection: IMetadata[] = [sampleWithRequiredData];
        expectedResult = service.addMetadataToCollectionIfMissing(metadataCollection, undefined, null);
        expect(expectedResult).toEqual(metadataCollection);
      });
    });

    describe('compareMetadata', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareMetadata(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: '0eb823cb-eb27-4d44-a3a2-5ae4a3acb025' };
        const entity2 = null;

        const compareResult1 = service.compareMetadata(entity1, entity2);
        const compareResult2 = service.compareMetadata(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: '0eb823cb-eb27-4d44-a3a2-5ae4a3acb025' };
        const entity2 = { id: '7c8cb81a-eae2-4ec8-91d4-a5a5ec343fa8' };

        const compareResult1 = service.compareMetadata(entity1, entity2);
        const compareResult2 = service.compareMetadata(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: '0eb823cb-eb27-4d44-a3a2-5ae4a3acb025' };
        const entity2 = { id: '0eb823cb-eb27-4d44-a3a2-5ae4a3acb025' };

        const compareResult1 = service.compareMetadata(entity1, entity2);
        const compareResult2 = service.compareMetadata(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
