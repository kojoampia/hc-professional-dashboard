import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IPatient } from '../patient.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../patient.test-samples';

import { PatientService, RestPatient } from './patient.service';

const requireRestSample: RestPatient = {
  ...sampleWithRequiredData,
  lastActivityAt: sampleWithRequiredData.lastActivityAt?.toJSON(),
  dateOfBirth: sampleWithRequiredData.dateOfBirth?.format(DATE_FORMAT),
};

describe('Patient Service', () => {
  let service: PatientService;
  let httpMock: HttpTestingController;
  let expectedResult: IPatient | IPatient[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(PatientService);
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

    it('should create a Patient', () => {
      const patient = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(patient).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Patient', () => {
      const patient = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(patient).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Patient', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Patient', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Patient', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addPatientToCollectionIfMissing', () => {
      it('should add a Patient to an empty array', () => {
        const patient: IPatient = sampleWithRequiredData;
        expectedResult = service.addPatientToCollectionIfMissing([], patient);
        expect(expectedResult).toEqual([patient]);
      });

      it('should not add a Patient to an array that contains it', () => {
        const patient: IPatient = sampleWithRequiredData;
        const patientCollection: IPatient[] = [
          {
            ...patient,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addPatientToCollectionIfMissing(patientCollection, patient);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Patient to an array that doesn't contain it", () => {
        const patient: IPatient = sampleWithRequiredData;
        const patientCollection: IPatient[] = [sampleWithPartialData];
        expectedResult = service.addPatientToCollectionIfMissing(patientCollection, patient);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(patient);
      });

      it('should add only unique Patient to an array', () => {
        const patientArray: IPatient[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const patientCollection: IPatient[] = [sampleWithRequiredData];
        expectedResult = service.addPatientToCollectionIfMissing(patientCollection, ...patientArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const patient: IPatient = sampleWithRequiredData;
        const patient2: IPatient = sampleWithPartialData;
        expectedResult = service.addPatientToCollectionIfMissing([], patient, patient2);
        expect(expectedResult).toEqual([patient, patient2]);
      });

      it('should accept null and undefined values', () => {
        const patient: IPatient = sampleWithRequiredData;
        expectedResult = service.addPatientToCollectionIfMissing([], null, patient, undefined);
        expect(expectedResult).toEqual([patient]);
      });

      it('should return initial array if no Patient is added', () => {
        const patientCollection: IPatient[] = [sampleWithRequiredData];
        expectedResult = service.addPatientToCollectionIfMissing(patientCollection, undefined, null);
        expect(expectedResult).toEqual(patientCollection);
      });
    });

    describe('comparePatient', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.comparePatient(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
        const entity2 = null;

        const compareResult1 = service.comparePatient(entity1, entity2);
        const compareResult2 = service.comparePatient(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
        const entity2 = { id: '7ee13815-76c1-4cab-8865-cf9e177b6367' };

        const compareResult1 = service.comparePatient(entity1, entity2);
        const compareResult2 = service.comparePatient(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: '88928db1-656e-430d-95c0-5cde75285e55' };
        const entity2 = { id: '88928db1-656e-430d-95c0-5cde75285e55' };

        const compareResult1 = service.comparePatient(entity1, entity2);
        const compareResult2 = service.comparePatient(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
