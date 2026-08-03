import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ITeam } from '../team.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../team.test-samples';

import { TeamService } from './team.service';

const requireRestSample: ITeam = {
  ...sampleWithRequiredData,
};

describe('Team Service', () => {
  let service: TeamService;
  let httpMock: HttpTestingController;
  let expectedResult: ITeam | ITeam[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(TeamService);
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

    it('should create a Team', () => {
      const team = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(team).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Team', () => {
      const team = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(team).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Team', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Team', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Team', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addTeamToCollectionIfMissing', () => {
      it('should add a Team to an empty array', () => {
        const team: ITeam = sampleWithRequiredData;
        expectedResult = service.addTeamToCollectionIfMissing([], team);
        expect(expectedResult).toEqual([team]);
      });

      it('should not add a Team to an array that contains it', () => {
        const team: ITeam = sampleWithRequiredData;
        const teamCollection: ITeam[] = [
          {
            ...team,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addTeamToCollectionIfMissing(teamCollection, team);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Team to an array that doesn't contain it", () => {
        const team: ITeam = sampleWithRequiredData;
        const teamCollection: ITeam[] = [sampleWithPartialData];
        expectedResult = service.addTeamToCollectionIfMissing(teamCollection, team);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(team);
      });

      it('should add only unique Team to an array', () => {
        const teamArray: ITeam[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const teamCollection: ITeam[] = [sampleWithRequiredData];
        expectedResult = service.addTeamToCollectionIfMissing(teamCollection, ...teamArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const team: ITeam = sampleWithRequiredData;
        const team2: ITeam = sampleWithPartialData;
        expectedResult = service.addTeamToCollectionIfMissing([], team, team2);
        expect(expectedResult).toEqual([team, team2]);
      });

      it('should accept null and undefined values', () => {
        const team: ITeam = sampleWithRequiredData;
        expectedResult = service.addTeamToCollectionIfMissing([], null, team, undefined);
        expect(expectedResult).toEqual([team]);
      });

      it('should return initial array if no Team is added', () => {
        const teamCollection: ITeam[] = [sampleWithRequiredData];
        expectedResult = service.addTeamToCollectionIfMissing(teamCollection, undefined, null);
        expect(expectedResult).toEqual(teamCollection);
      });
    });

    describe('compareTeam', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareTeam(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: '07c2eeb9-6f13-455e-bbad-df15a9442470' };
        const entity2 = null;

        const compareResult1 = service.compareTeam(entity1, entity2);
        const compareResult2 = service.compareTeam(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: '07c2eeb9-6f13-455e-bbad-df15a9442470' };
        const entity2 = { id: 'e82fb6d5-fe08-47fe-a516-8889cd5f9288' };

        const compareResult1 = service.compareTeam(entity1, entity2);
        const compareResult2 = service.compareTeam(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: '07c2eeb9-6f13-455e-bbad-df15a9442470' };
        const entity2 = { id: '07c2eeb9-6f13-455e-bbad-df15a9442470' };

        const compareResult1 = service.compareTeam(entity1, entity2);
        const compareResult2 = service.compareTeam(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
