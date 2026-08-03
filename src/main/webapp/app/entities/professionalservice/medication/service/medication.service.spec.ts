import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DATE_FORMAT } from 'app/config/input.constants';
import { IMedication } from '../medication.model';
import { sampleWithFullData, sampleWithNewData, sampleWithPartialData, sampleWithRequiredData } from '../medication.test-samples';

import { MedicationService, RestMedication } from './medication.service';

const requireRestSample: RestMedication = {
  ...sampleWithRequiredData,
  createdDate: sampleWithRequiredData.createdDate?.format(DATE_FORMAT),
  modifiedDate: sampleWithRequiredData.modifiedDate?.format(DATE_FORMAT),
};

describe('Medication Service', () => {
  let service: MedicationService;
  let httpMock: HttpTestingController;
  let expectedResult: IMedication | IMedication[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    expectedResult = null;
    service = TestBed.inject(MedicationService);
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

    it('should create a Medication', () => {
      const medication = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(medication).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Medication', () => {
      const medication = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(medication).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Medication', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Medication', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Medication', () => {
      service.delete('ABC').subscribe();

      const requests = httpMock.match({ method: 'DELETE' });
      expect(requests.length).toBe(1);
    });

    describe('addMedicationToCollectionIfMissing', () => {
      it('should add a Medication to an empty array', () => {
        const medication: IMedication = sampleWithRequiredData;
        expectedResult = service.addMedicationToCollectionIfMissing([], medication);
        expect(expectedResult).toEqual([medication]);
      });

      it('should not add a Medication to an array that contains it', () => {
        const medication: IMedication = sampleWithRequiredData;
        const medicationCollection: IMedication[] = [
          {
            ...medication,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addMedicationToCollectionIfMissing(medicationCollection, medication);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Medication to an array that doesn't contain it", () => {
        const medication: IMedication = sampleWithRequiredData;
        const medicationCollection: IMedication[] = [sampleWithPartialData];
        expectedResult = service.addMedicationToCollectionIfMissing(medicationCollection, medication);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(medication);
      });

      it('should add only unique Medication to an array', () => {
        const medicationArray: IMedication[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const medicationCollection: IMedication[] = [sampleWithRequiredData];
        expectedResult = service.addMedicationToCollectionIfMissing(medicationCollection, ...medicationArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const medication: IMedication = sampleWithRequiredData;
        const medication2: IMedication = sampleWithPartialData;
        expectedResult = service.addMedicationToCollectionIfMissing([], medication, medication2);
        expect(expectedResult).toEqual([medication, medication2]);
      });

      it('should accept null and undefined values', () => {
        const medication: IMedication = sampleWithRequiredData;
        expectedResult = service.addMedicationToCollectionIfMissing([], null, medication, undefined);
        expect(expectedResult).toEqual([medication]);
      });

      it('should return initial array if no Medication is added', () => {
        const medicationCollection: IMedication[] = [sampleWithRequiredData];
        expectedResult = service.addMedicationToCollectionIfMissing(medicationCollection, undefined, null);
        expect(expectedResult).toEqual(medicationCollection);
      });
    });

    describe('compareMedication', () => {
      it('should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareMedication(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('should return false if one entity is null', () => {
        const entity1 = { id: 'cefe9515-9d76-403f-afa9-35f0d986275b' };
        const entity2 = null;

        const compareResult1 = service.compareMedication(entity1, entity2);
        const compareResult2 = service.compareMedication(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey differs', () => {
        const entity1 = { id: 'cefe9515-9d76-403f-afa9-35f0d986275b' };
        const entity2 = { id: 'f8ed80ef-a642-41e1-b2de-93a365ad06be' };

        const compareResult1 = service.compareMedication(entity1, entity2);
        const compareResult2 = service.compareMedication(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('should return false if primaryKey matches', () => {
        const entity1 = { id: 'cefe9515-9d76-403f-afa9-35f0d986275b' };
        const entity2 = { id: 'cefe9515-9d76-403f-afa9-35f0d986275b' };

        const compareResult1 = service.compareMedication(entity1, entity2);
        const compareResult2 = service.compareMedication(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
