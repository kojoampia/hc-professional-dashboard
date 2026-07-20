import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IMembership } from '../membership.model';
import { sampleWithRequiredData, sampleWithNewData, sampleWithPartialData, sampleWithFullData } from '../membership.test-samples';

import { MembershipService, RestMembership } from './membership.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

const requireRestSample: RestMembership = {
  ...sampleWithRequiredData,
  createdDate: sampleWithRequiredData.createdDate?.format(DATE_FORMAT),
  modifiedDate: sampleWithRequiredData.modifiedDate?.format(DATE_FORMAT),
};

describe('Membership Service', () => {
  let service: MembershipService;
  let httpMock: HttpTestingController;
  let expectedResult: IMembership | IMembership[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(MembershipService);
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

    it('should create a Membership', () => {
      const membership = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(membership).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Membership', () => {
      const membership = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(membership).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Membership', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Membership', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Membership', () => {
      const expected = true;

      service.delete('ABC').subscribe(resp => (expectedResult = resp.ok));

      const req = httpMock.expectOne({ method: 'DELETE' });
      req.flush({ status: 200 });
      expect(expectedResult).toBe(expected);
    });

    it('should handle exceptions for searching a Membership', () => {
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

    describe('addMembershipToCollectionIfMissing', () => {
      it('should add a Membership to an empty array', () => {
        const membership: IMembership = sampleWithRequiredData;
        expectedResult = service.addMembershipToCollectionIfMissing([], membership);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(membership);
      });

      it('should not add a Membership to an array that contains it', () => {
        const membership: IMembership = sampleWithRequiredData;
        const membershipCollection: IMembership[] = [
          {
            ...membership,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addMembershipToCollectionIfMissing(membershipCollection, membership);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Membership to an array that doesn't contain it", () => {
        const membership: IMembership = sampleWithRequiredData;
        const membershipCollection: IMembership[] = [sampleWithPartialData];
        expectedResult = service.addMembershipToCollectionIfMissing(membershipCollection, membership);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(membership);
      });

      it('should add only unique Membership to an array', () => {
        const membershipArray: IMembership[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const membershipCollection: IMembership[] = [sampleWithRequiredData];
        expectedResult = service.addMembershipToCollectionIfMissing(membershipCollection, ...membershipArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const membership: IMembership = sampleWithRequiredData;
        const membership2: IMembership = sampleWithPartialData;
        expectedResult = service.addMembershipToCollectionIfMissing([], membership, membership2);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(membership);
        expect(expectedResult).toContain(membership2);
      });

      it('should accept null and undefined values', () => {
        const membership: IMembership = sampleWithRequiredData;
        expectedResult = service.addMembershipToCollectionIfMissing([], null, membership, undefined);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(membership);
      });

      it('should return initial array if no Membership is added', () => {
        const membershipCollection: IMembership[] = [sampleWithRequiredData];
        expectedResult = service.addMembershipToCollectionIfMissing(membershipCollection, undefined, null);
        expect(expectedResult).toEqual(membershipCollection);
      });
    });

    describe('compareMembership', () => {
      it('Should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareMembership(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('Should return false if one entity is null', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = null;

        const compareResult1 = service.compareMembership(entity1, entity2);
        const compareResult2 = service.compareMembership(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey differs', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = { id: 'CBA' };

        const compareResult1 = service.compareMembership(entity1, entity2);
        const compareResult2 = service.compareMembership(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey matches', () => {
        const entity1 = { id: 'ABC' };
        const entity2 = { id: 'ABC' };

        const compareResult1 = service.compareMembership(entity1, entity2);
        const compareResult2 = service.compareMembership(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
