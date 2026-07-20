import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IAddress } from '../address.model';
import { sampleWithRequiredData, sampleWithNewData, sampleWithPartialData, sampleWithFullData } from '../address.test-samples';

import { AddressService, RestAddress } from './address.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

const requireRestSample: RestAddress = {
  ...sampleWithRequiredData,
  createdDate: sampleWithRequiredData.createdDate?.format(DATE_FORMAT),
  modifiedDate: sampleWithRequiredData.modifiedDate?.format(DATE_FORMAT),
};

describe('Address Service', () => {
  let service: AddressService;
  let httpMock: HttpTestingController;
  let expectedResult: IAddress | IAddress[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    expectedResult = null;
    service = TestBed.inject(AddressService);
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

    it('should create a Address', () => {
      const address = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(address).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Address', () => {
      const address = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(address).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Address', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Address', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Address', () => {
      const expected = true;

      service.delete('ABC').subscribe(resp => (expectedResult = resp.ok));

      const req = httpMock.expectOne({ method: 'DELETE' });
      req.flush({ status: 200 });
      expect(expectedResult).toBe(expected);
    });

    it('should handle exceptions for searching a Address', () => {
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

    describe('addAddressToCollectionIfMissing', () => {
      it('should add a Address to an empty array', () => {
        const address: IAddress = sampleWithRequiredData;
        expectedResult = service.addAddressToCollectionIfMissing([], address);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(address);
      });

      it('should not add a Address to an array that contains it', () => {
        const address: IAddress = sampleWithRequiredData;
        const addressCollection: IAddress[] = [
          {
            ...address,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addAddressToCollectionIfMissing(addressCollection, address);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Address to an array that doesn't contain it", () => {
        const address: IAddress = sampleWithRequiredData;
        const addressCollection: IAddress[] = [sampleWithPartialData];
        expectedResult = service.addAddressToCollectionIfMissing(addressCollection, address);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(address);
      });

      it('should add only unique Address to an array', () => {
        const addressArray: IAddress[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const addressCollection: IAddress[] = [sampleWithRequiredData];
        expectedResult = service.addAddressToCollectionIfMissing(addressCollection, ...addressArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const address: IAddress = sampleWithRequiredData;
        const address2: IAddress = sampleWithPartialData;
        expectedResult = service.addAddressToCollectionIfMissing([], address, address2);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(address);
        expect(expectedResult).toContain(address2);
      });

      it('should accept null and undefined values', () => {
        const address: IAddress = sampleWithRequiredData;
        expectedResult = service.addAddressToCollectionIfMissing([], null, address, undefined);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(address);
      });

      it('should return initial array if no Address is added', () => {
        const addressCollection: IAddress[] = [sampleWithRequiredData];
        expectedResult = service.addAddressToCollectionIfMissing(addressCollection, undefined, null);
        expect(expectedResult).toEqual(addressCollection);
      });
    });

    describe('compareAddress', () => {
      it('Should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareAddress(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('Should return false if one entity is null', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = null;

        const compareResult1 = service.compareAddress(entity1, entity2);
        const compareResult2 = service.compareAddress(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey differs', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = { id: 'CBA' };

        const compareResult1 = service.compareAddress(entity1, entity2);
        const compareResult2 = service.compareAddress(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey matches', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = { id: 'ABC' };

        const compareResult1 = service.compareAddress(entity1, entity2);
        const compareResult2 = service.compareAddress(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
