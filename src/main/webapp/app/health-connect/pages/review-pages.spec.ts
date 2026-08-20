import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { Authority } from 'app/config/authority.constants';
import { GatewayAdminApiService } from '../api/gateway-admin-api.service';
import { OnboardingApiService, OnboardingApplicationDto } from '../api/onboarding-api.service';
import routes from '../health-connect.routes';
import appRoutes from 'app/app.routes';
import ReviewDetailPageComponent from './review-detail-page.component';
import ReviewQueuePageComponent from './review-queue-page.component';

/**
 * WP5 gate: reviewer/admin affordances are role-gated and disjoint from the
 * applicant wizard — the review routes demand ROLE_ADMIN, the queue surfaces
 * the careers attribution source, decisions follow the state machine, and the
 * authority grant goes through the gateway before the api records it.
 */
describe('Review pages (WP5 gate)', () => {
  const application = (
    status: OnboardingApplicationDto['status'],
    extra: Partial<OnboardingApplicationDto> = {},
  ): OnboardingApplicationDto => ({
    id: 'app-1',
    accountId: 'candidate',
    login: 'candidate',
    requestedRole: 'ROLE_NURSE',
    status,
    source: 'web-careers',
    submittedAt: '2026-07-29T08:00:00Z',
    ...extra,
  });

  describe('route gating', () => {
    it('review routes are ROLE_ADMIN only while the applicant wizard is plain-authenticated', () => {
      const review = routes.find(r => r.path === 'review')!;
      const reviewDetail = routes.find(r => r.path === 'review/:id')!;
      expect(review.data?.['authorities']).toEqual([Authority.ADMIN]);
      expect(reviewDetail.data?.['authorities']).toEqual([Authority.ADMIN]);

      // Onboarding is no longer a screen: its steps are tabs on /account/profile, and this path
      // survives only as a redirect for the bookmarks and emails that still point at it. What has
      // to stay true is that reaching it requires no clinical role — an applicant holds only
      // ROLE_USER, and the profile page they land on is guarded by authentication alone.
      const onboarding = appRoutes.find(r => r.path === 'onboarding')!;
      expect(onboarding.redirectTo).toBeDefined();
      expect(onboarding.data?.['authorities']).toBeUndefined();

      const profileHost = appRoutes.find(r => r.path === '' && r.children?.some(child => child.path === 'account'))!;
      expect(profileHost.data?.['authorities']).toBeUndefined();
    });
  });

  describe('queue', () => {
    let api: { listApplications: jest.Mock };
    let fixture: ComponentFixture<ReviewQueuePageComponent>;

    beforeEach(async () => {
      api = { listApplications: jest.fn(() => of([application('CREDENTIAL_REVIEW')])) };
      await TestBed.configureTestingModule({
        imports: [ReviewQueuePageComponent, TranslateModule.forRoot()],
        providers: [
          { provide: OnboardingApiService, useValue: api as unknown as OnboardingApiService },
          { provide: Router, useValue: { navigate: jest.fn() } },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(ReviewQueuePageComponent);
      fixture.detectChanges();
    });

    it('defaults to the credential-review filter and surfaces the attribution source column', () => {
      expect(api.listApplications).toHaveBeenCalledWith('CREDENTIAL_REVIEW');
      const sourceColumn = fixture.componentInstance.columns.find(c => c.id === 'source')!;
      expect(sourceColumn.value(application('CREDENTIAL_REVIEW'))).toBe('web-careers');
      expect(sourceColumn.value(application('CREDENTIAL_REVIEW', { source: null }))).toBe('—');
    });

    it('reloads with the selected filter, ALL meaning no status param', () => {
      fixture.componentInstance.setFilter('ALL');
      expect(api.listApplications).toHaveBeenLastCalledWith(undefined);
      fixture.componentInstance.setFilter('APPROVED');
      expect(api.listApplications).toHaveBeenLastCalledWith('APPROVED');
    });

    it('opens an application review from the row action', () => {
      const router = TestBed.inject(Router);
      fixture.componentInstance.open({ actionId: 'open', row: application('CREDENTIAL_REVIEW') });
      expect(router.navigate).toHaveBeenCalledWith(['/review', 'app-1']);
    });
  });

  describe('detail', () => {
    let api: Record<string, jest.Mock>;
    let gatewayAdmin: { grantAuthority: jest.Mock };
    let fixture: ComponentFixture<ReviewDetailPageComponent>;
    let component: ReviewDetailPageComponent;

    const configure = async (status: OnboardingApplicationDto['status']): Promise<void> => {
      api = {
        getApplication: jest.fn(() => of(application(status))),
        applicationDocuments: jest.fn(() =>
          of([
            { id: 'doc-1', type: 'LICENSE', verificationStatus: 'PENDING' },
            { id: 'doc-2', type: 'CERTIFICATE', verificationStatus: 'VERIFIED' },
          ]),
        ),
        events: jest.fn(() => of([])),
        verifyDocument: jest.fn(() => of({ id: 'doc-1', type: 'LICENSE', verificationStatus: 'VERIFIED' })),
        rejectDocument: jest.fn(() => of({ id: 'doc-1', type: 'LICENSE', verificationStatus: 'REJECTED' })),
        decide: jest.fn(() => of(application('APPROVED'))),
        assignOrganization: jest.fn(() => of(application('ORGANIZATION_ASSIGNED'))),
        markAuthorityAssigned: jest.fn(() => of(application('AUTHORITY_ASSIGNED'))),
        markRosterConfigured: jest.fn(() => of(application('ROSTER_CONFIGURED'))),
        activate: jest.fn(() => of(application('ACTIVE'))),
        suspend: jest.fn(() => of(application('SUSPENDED'))),
        documentContent: jest.fn(() => of(new Blob(['%PDF'], { type: 'application/pdf' }))),
      };
      gatewayAdmin = { grantAuthority: jest.fn(() => of({ login: 'candidate' })) };
      await TestBed.configureTestingModule({
        imports: [ReviewDetailPageComponent, TranslateModule.forRoot()],
        providers: [
          { provide: OnboardingApiService, useValue: api as unknown as OnboardingApiService },
          { provide: GatewayAdminApiService, useValue: gatewayAdmin as unknown as GatewayAdminApiService },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'app-1' }) } } },
          { provide: Router, useValue: { navigate: jest.fn() } },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(ReviewDetailPageComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    it('blocks approval until every document is verified, and requires a reason for corrections', async () => {
      await configure('CREDENTIAL_REVIEW');
      expect(component.allDocumentsVerified()).toBe(false);
      const approve = fixture.nativeElement.querySelector('[data-cy="approve"]') as HTMLButtonElement;
      expect(approve.disabled).toBe(true);

      component.decide('RETURNED_FOR_CORRECTION');
      expect(api['decide']).not.toHaveBeenCalled();

      component.decisionForm.patchValue({ reason: 'License expired', correctionNotes: 'documents' });
      component.decide('RETURNED_FOR_CORRECTION');
      expect(api['decide']).toHaveBeenCalledWith('app-1', 'RETURNED_FOR_CORRECTION', 'License expired', 'documents');
    });

    it('verifies and rejects documents (rejection needs a reason)', async () => {
      await configure('CREDENTIAL_REVIEW');
      component.verify({ id: 'doc-1', type: 'LICENSE' });
      expect(api['verifyDocument']).toHaveBeenCalledWith('doc-1');

      component.reject({ id: 'doc-1', type: 'LICENSE' });
      expect(api['rejectDocument']).not.toHaveBeenCalled();
      component.decisionForm.patchValue({ reason: 'Blurry scan' });
      component.reject({ id: 'doc-1', type: 'LICENSE' });
      expect(api['rejectDocument']).toHaveBeenCalledWith('doc-1', 'Blurry scan');
    });

    it('walks the activation pipeline with status-specific affordances', async () => {
      await configure('APPROVED');
      expect(fixture.nativeElement.querySelector('[data-cy="organizationForm"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-cy="decisionButtons"]')).toBeNull();

      component.organizationForm.patchValue({ specialtyCategoryId: 'cat-1', teamIds: 'team-1, team-2' });
      component.assignOrganization();
      expect(api['assignOrganization']).toHaveBeenCalledWith('app-1', {
        specialtyCategoryId: 'cat-1',
        teamIds: ['team-1', 'team-2'],
        supervisorProfileId: null,
      });
    });

    it('grants the authority through the gateway before marking the state on the api', async () => {
      await configure('ORGANIZATION_ASSIGNED');
      component.assignAuthority();
      expect(gatewayAdmin.grantAuthority).toHaveBeenCalledWith('candidate', 'ROLE_NURSE');
      expect(api['markAuthorityAssigned']).toHaveBeenCalledWith('app-1');
    });

    it('shows the attribution source badge for reviewed applications', async () => {
      await configure('CREDENTIAL_REVIEW');
      const badge = fixture.nativeElement.querySelector('[data-cy="reviewSource"]');
      expect(badge.textContent).toContain('web-careers');
    });
  });
});
