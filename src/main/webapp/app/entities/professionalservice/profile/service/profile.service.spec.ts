import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IProfile } from '../profile.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../profile.test-samples';

import { ProfileService, RestProfile } from './profile.service';

const requireRestSample: RestProfile = {
  ...sampleWithRequiredData,
  birthDate: sampleWithRequiredData.birthDate?.format(DATE_FORMAT),
};

describe('Profile Service', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;
  let expectedResult: IProfile | IProfile[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(ProfileService);
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

    it('should create a Profile', () => {
      const profile = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(profile).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Profile', () => {
      const profile = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(profile).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Profile', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Profile', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Profile', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addProfileToCollectionIfMissing', () => {
      it('should add a Profile to an empty array', () => {
        const profile: IProfile = sampleWithRequiredData;
        expectedResult = service.addProfileToCollectionIfMissing([], profile);
        expect(expectedResult).toEqual([profile]);
      });

      it('should not add a Profile to an array that contains it', () => {
        const profile: IProfile = sampleWithRequiredData;
        const profileCollection: IProfile[] = [
          {
            ...profile,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addProfileToCollectionIfMissing(profileCollection, profile);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Profile to an array that doesn't contain it", () => {
        const profile: IProfile = sampleWithRequiredData;
        const profileCollection: IProfile[] = [sampleWithPartialData];
        expectedResult = service.addProfileToCollectionIfMissing(profileCollection, profile);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(profile);
      });

      it('should add only unique Profile to an array', () => {
        const profileArray: IProfile[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const profileCollection: IProfile[] = [sampleWithRequiredData];
        expectedResult = service.addProfileToCollectionIfMissing(profileCollection, ...profileArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const profile: IProfile = sampleWithRequiredData;
        const profile2: IProfile = sampleWithPartialData;
        expectedResult = service.addProfileToCollectionIfMissing([], profile, profile2);
        expect(expectedResult).toEqual([profile, profile2]);
      });

      it('should accept null and undefined values', () => {
        const profile: IProfile = sampleWithRequiredData;
        expectedResult = service.addProfileToCollectionIfMissing([], null, profile, undefined);
        expect(expectedResult).toEqual([profile]);
      });

      it('should return initial array if no Profile is added', () => {
        const profileCollection: IProfile[] = [sampleWithRequiredData];
        expectedResult = service.addProfileToCollectionIfMissing(profileCollection, undefined, null);
        expect(expectedResult).toEqual(profileCollection);
      });
    });

    describe('compareProfile', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareProfile(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
        const entity2 = null;

        const compareResult1 = service.compareProfile(entity1, entity2);
        const compareResult2 = service.compareProfile(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
        const entity2 = { id: '5ac8ab7a-123d-4318-b51e-b9301878a25d' };

        const compareResult1 = service.compareProfile(entity1, entity2);
        const compareResult2 = service.compareProfile(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };
        const entity2 = { id: 'f60e8f71-7b26-4f3d-8111-2c32dce7269d' };

        const compareResult1 = service.compareProfile(entity1, entity2);
        const compareResult2 = service.compareProfile(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
