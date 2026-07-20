import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IHCCredential } from '../hc-credential.model';
import { sampleWithRequiredData, sampleWithNewData, sampleWithPartialData, sampleWithFullData } from '../hc-credential.test-samples';

import { HCCredentialService, RestHCCredential } from './hc-credential.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

const requireRestSample: RestHCCredential = {
  ...sampleWithRequiredData,
  createdDate: sampleWithRequiredData.createdDate?.format(DATE_FORMAT),
  modifiedDate: sampleWithRequiredData.modifiedDate?.format(DATE_FORMAT),
};

describe('HCCredential Service', () => {
  let service: HCCredentialService;
  let httpMock: HttpTestingController;
  let expectedResult: IHCCredential | IHCCredential[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    expectedResult = null;
    service = TestBed.inject(HCCredentialService);
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

    it('should create a HCCredential', () => {
      const hCCredential = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(hCCredential).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a HCCredential', () => {
      const hCCredential = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(hCCredential).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a HCCredential', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of HCCredential', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a HCCredential', () => {
      const expected = true;

      service.delete('ABC').subscribe(resp => (expectedResult = resp.ok));

      const req = httpMock.expectOne({ method: 'DELETE' });
      req.flush({ status: 200 });
      expect(expectedResult).toBe(expected);
    });

    it('should handle exceptions for searching a HCCredential', () => {
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

    describe('addHCCredentialToCollectionIfMissing', () => {
      it('should add a HCCredential to an empty array', () => {
        const hCCredential: IHCCredential = sampleWithRequiredData;
        expectedResult = service.addHCCredentialToCollectionIfMissing([], hCCredential);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(hCCredential);
      });

      it('should not add a HCCredential to an array that contains it', () => {
        const hCCredential: IHCCredential = sampleWithRequiredData;
        const hCCredentialCollection: IHCCredential[] = [
          {
            ...hCCredential,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addHCCredentialToCollectionIfMissing(hCCredentialCollection, hCCredential);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a HCCredential to an array that doesn't contain it", () => {
        const hCCredential: IHCCredential = sampleWithRequiredData;
        const hCCredentialCollection: IHCCredential[] = [sampleWithPartialData];
        expectedResult = service.addHCCredentialToCollectionIfMissing(hCCredentialCollection, hCCredential);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(hCCredential);
      });

      it('should add only unique HCCredential to an array', () => {
        const hCCredentialArray: IHCCredential[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const hCCredentialCollection: IHCCredential[] = [sampleWithRequiredData];
        expectedResult = service.addHCCredentialToCollectionIfMissing(hCCredentialCollection, ...hCCredentialArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const hCCredential: IHCCredential = sampleWithRequiredData;
        const hCCredential2: IHCCredential = sampleWithPartialData;
        expectedResult = service.addHCCredentialToCollectionIfMissing([], hCCredential, hCCredential2);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(hCCredential);
        expect(expectedResult).toContain(hCCredential2);
      });

      it('should accept null and undefined values', () => {
        const hCCredential: IHCCredential = sampleWithRequiredData;
        expectedResult = service.addHCCredentialToCollectionIfMissing([], null, hCCredential, undefined);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(hCCredential);
      });

      it('should return initial array if no HCCredential is added', () => {
        const hCCredentialCollection: IHCCredential[] = [sampleWithRequiredData];
        expectedResult = service.addHCCredentialToCollectionIfMissing(hCCredentialCollection, undefined, null);
        expect(expectedResult).toEqual(hCCredentialCollection);
      });
    });

    describe('compareHCCredential', () => {
      it('Should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareHCCredential(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('Should return false if one entity is null', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = null;

        const compareResult1 = service.compareHCCredential(entity1, entity2);
        const compareResult2 = service.compareHCCredential(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey differs', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = { id: 'CBA' };

        const compareResult1 = service.compareHCCredential(entity1, entity2);
        const compareResult2 = service.compareHCCredential(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey matches', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = { id: 'ABC' };

        const compareResult1 = service.compareHCCredential(entity1, entity2);
        const compareResult2 = service.compareHCCredential(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
