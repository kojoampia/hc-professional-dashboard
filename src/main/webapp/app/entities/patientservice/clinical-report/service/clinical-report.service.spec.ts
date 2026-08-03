import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IClinicalReport } from '../clinical-report.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../clinical-report.test-samples';

import { ClinicalReportService, RestClinicalReport } from './clinical-report.service';

const requireRestSample: RestClinicalReport = {
  ...sampleWithRequiredData,
  occurredAt: sampleWithRequiredData.occurredAt?.toJSON(),
};

describe('ClinicalReport Service', () => {
  let service: ClinicalReportService;
  let httpMock: HttpTestingController;
  let expectedResult: IClinicalReport | IClinicalReport[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(ClinicalReportService);
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

    it('should create a ClinicalReport', () => {
      const clinicalReport = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(clinicalReport).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a ClinicalReport', () => {
      const clinicalReport = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(clinicalReport).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a ClinicalReport', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of ClinicalReport', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a ClinicalReport', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addClinicalReportToCollectionIfMissing', () => {
      it('should add a ClinicalReport to an empty array', () => {
        const clinicalReport: IClinicalReport = sampleWithRequiredData;
        expectedResult = service.addClinicalReportToCollectionIfMissing([], clinicalReport);
        expect(expectedResult).toEqual([clinicalReport]);
      });

      it('should not add a ClinicalReport to an array that contains it', () => {
        const clinicalReport: IClinicalReport = sampleWithRequiredData;
        const clinicalReportCollection: IClinicalReport[] = [
          {
            ...clinicalReport,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addClinicalReportToCollectionIfMissing(clinicalReportCollection, clinicalReport);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a ClinicalReport to an array that doesn't contain it", () => {
        const clinicalReport: IClinicalReport = sampleWithRequiredData;
        const clinicalReportCollection: IClinicalReport[] = [sampleWithPartialData];
        expectedResult = service.addClinicalReportToCollectionIfMissing(clinicalReportCollection, clinicalReport);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(clinicalReport);
      });

      it('should add only unique ClinicalReport to an array', () => {
        const clinicalReportArray: IClinicalReport[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const clinicalReportCollection: IClinicalReport[] = [sampleWithRequiredData];
        expectedResult = service.addClinicalReportToCollectionIfMissing(clinicalReportCollection, ...clinicalReportArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const clinicalReport: IClinicalReport = sampleWithRequiredData;
        const clinicalReport2: IClinicalReport = sampleWithPartialData;
        expectedResult = service.addClinicalReportToCollectionIfMissing([], clinicalReport, clinicalReport2);
        expect(expectedResult).toEqual([clinicalReport, clinicalReport2]);
      });

      it('should accept null and undefined values', () => {
        const clinicalReport: IClinicalReport = sampleWithRequiredData;
        expectedResult = service.addClinicalReportToCollectionIfMissing([], null, clinicalReport, undefined);
        expect(expectedResult).toEqual([clinicalReport]);
      });

      it('should return initial array if no ClinicalReport is added', () => {
        const clinicalReportCollection: IClinicalReport[] = [sampleWithRequiredData];
        expectedResult = service.addClinicalReportToCollectionIfMissing(clinicalReportCollection, undefined, null);
        expect(expectedResult).toEqual(clinicalReportCollection);
      });
    });

    describe('compareClinicalReport', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareClinicalReport(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: '01933c67-ade2-4ab5-a4bb-6f68a83c4787' };
        const entity2 = null;

        const compareResult1 = service.compareClinicalReport(entity1, entity2);
        const compareResult2 = service.compareClinicalReport(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: '01933c67-ade2-4ab5-a4bb-6f68a83c4787' };
        const entity2 = { id: '9d4161be-422f-42c5-ac62-beacb6a29ddf' };

        const compareResult1 = service.compareClinicalReport(entity1, entity2);
        const compareResult2 = service.compareClinicalReport(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: '01933c67-ade2-4ab5-a4bb-6f68a83c4787' };
        const entity2 = { id: '01933c67-ade2-4ab5-a4bb-6f68a83c4787' };

        const compareResult1 = service.compareClinicalReport(entity1, entity2);
        const compareResult2 = service.compareClinicalReport(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
