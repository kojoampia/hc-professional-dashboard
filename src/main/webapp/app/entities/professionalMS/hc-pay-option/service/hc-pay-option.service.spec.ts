import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { IHCPayOption } from '../hc-pay-option.model';
import { sampleWithRequiredData, sampleWithNewData, sampleWithPartialData, sampleWithFullData } from '../hc-pay-option.test-samples';

import { HCPayOptionService } from './hc-pay-option.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

const requireRestSample: IHCPayOption = {
  ...sampleWithRequiredData,
};

describe('HCPayOption Service', () => {
  let service: HCPayOptionService;
  let httpMock: HttpTestingController;
  let expectedResult: IHCPayOption | IHCPayOption[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(HCPayOptionService);
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

    it('should create a HCPayOption', () => {
      const hCPayOption = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(hCPayOption).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a HCPayOption', () => {
      const hCPayOption = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(hCPayOption).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a HCPayOption', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of HCPayOption', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a HCPayOption', () => {
      const expected = true;

      service.delete('ABC').subscribe(resp => (expectedResult = resp.ok));

      const req = httpMock.expectOne({ method: 'DELETE' });
      req.flush({ status: 200 });
      expect(expectedResult).toBe(expected);
    });

    it('should handle exceptions for searching a HCPayOption', () => {
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

    describe('addHCPayOptionToCollectionIfMissing', () => {
      it('should add a HCPayOption to an empty array', () => {
        const hCPayOption: IHCPayOption = sampleWithRequiredData;
        expectedResult = service.addHCPayOptionToCollectionIfMissing([], hCPayOption);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(hCPayOption);
      });

      it('should not add a HCPayOption to an array that contains it', () => {
        const hCPayOption: IHCPayOption = sampleWithRequiredData;
        const hCPayOptionCollection: IHCPayOption[] = [
          {
            ...hCPayOption,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addHCPayOptionToCollectionIfMissing(hCPayOptionCollection, hCPayOption);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a HCPayOption to an array that doesn't contain it", () => {
        const hCPayOption: IHCPayOption = sampleWithRequiredData;
        const hCPayOptionCollection: IHCPayOption[] = [sampleWithPartialData];
        expectedResult = service.addHCPayOptionToCollectionIfMissing(hCPayOptionCollection, hCPayOption);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(hCPayOption);
      });

      it('should add only unique HCPayOption to an array', () => {
        const hCPayOptionArray: IHCPayOption[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const hCPayOptionCollection: IHCPayOption[] = [sampleWithRequiredData];
        expectedResult = service.addHCPayOptionToCollectionIfMissing(hCPayOptionCollection, ...hCPayOptionArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const hCPayOption: IHCPayOption = sampleWithRequiredData;
        const hCPayOption2: IHCPayOption = sampleWithPartialData;
        expectedResult = service.addHCPayOptionToCollectionIfMissing([], hCPayOption, hCPayOption2);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(hCPayOption);
        expect(expectedResult).toContain(hCPayOption2);
      });

      it('should accept null and undefined values', () => {
        const hCPayOption: IHCPayOption = sampleWithRequiredData;
        expectedResult = service.addHCPayOptionToCollectionIfMissing([], null, hCPayOption, undefined);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(hCPayOption);
      });

      it('should return initial array if no HCPayOption is added', () => {
        const hCPayOptionCollection: IHCPayOption[] = [sampleWithRequiredData];
        expectedResult = service.addHCPayOptionToCollectionIfMissing(hCPayOptionCollection, undefined, null);
        expect(expectedResult).toEqual(hCPayOptionCollection);
      });
    });

    describe('compareHCPayOption', () => {
      it('Should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareHCPayOption(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('Should return false if one entity is null', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = null;

        const compareResult1 = service.compareHCPayOption(entity1, entity2);
        const compareResult2 = service.compareHCPayOption(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey differs', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = { id: 'CBA' };

        const compareResult1 = service.compareHCPayOption(entity1, entity2);
        const compareResult2 = service.compareHCPayOption(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey matches', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = { id: 'ABC' };

        const compareResult1 = service.compareHCPayOption(entity1, entity2);
        const compareResult2 = service.compareHCPayOption(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
