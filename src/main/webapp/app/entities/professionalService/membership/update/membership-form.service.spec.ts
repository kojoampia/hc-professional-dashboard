import { TestBed } from '@angular/core/testing';

import { sampleWithRequiredData, sampleWithNewData } from '../membership.test-samples';

import { MembershipFormService } from './membership-form.service';

describe('Membership Form Service', () => {
  let service: MembershipFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MembershipFormService);
  });

  describe('Service methods', () => {
    describe('createMembershipFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createMembershipFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            description: expect.any(Object),
            status: expect.any(Object),
            createdDate: expect.any(Object),
            modifiedDate: expect.any(Object),
            createdBy: expect.any(Object),
            modifiedBy: expect.any(Object),
          }),
        );
      });

      it('passing IMembership should create a new form with FormGroup', () => {
        const formGroup = service.createMembershipFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            name: expect.any(Object),
            description: expect.any(Object),
            status: expect.any(Object),
            createdDate: expect.any(Object),
            modifiedDate: expect.any(Object),
            createdBy: expect.any(Object),
            modifiedBy: expect.any(Object),
          }),
        );
      });
    });

    describe('getMembership', () => {
      it('should return NewMembership for default Membership initial value', () => {
        const formGroup = service.createMembershipFormGroup(sampleWithNewData);

        const membership = service.getMembership(formGroup) as any;

        expect(membership).toMatchObject(sampleWithNewData);
      });

      it('should return NewMembership for empty Membership initial value', () => {
        const formGroup = service.createMembershipFormGroup();

        const membership = service.getMembership(formGroup) as any;

        expect(membership).toMatchObject({});
      });

      it('should return IMembership', () => {
        const formGroup = service.createMembershipFormGroup(sampleWithRequiredData);

        const membership = service.getMembership(formGroup) as any;

        expect(membership).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IMembership should not enable id FormControl', () => {
        const formGroup = service.createMembershipFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewMembership should disable id FormControl', () => {
        const formGroup = service.createMembershipFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
