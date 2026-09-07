import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

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

    const DEFAULT_DOCUMENTS = [
      { id: 'doc-1', type: 'LICENSE', verificationStatus: 'PENDING' },
      { id: 'doc-2', type: 'CERTIFICATE', verificationStatus: 'VERIFIED' },
    ];

    const configure = async (status: OnboardingApplicationDto['status'], documents: unknown[] = DEFAULT_DOCUMENTS): Promise<void> => {
      api = {
        getApplication: jest.fn(() => of(application(status))),
        applicationDocuments: jest.fn(() => of(documents)),
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

    it('lets a replaced document stay on screen without blocking approval (backlog item 20)', async () => {
      // A certificate the reviewer rejected, which the applicant then re-uploaded. The rejected row
      // is deliberately never deleted — it is credential history — so before item 20 it held
      // allDocumentsVerified() false for ever and greyed out Approve with nothing anyone could do
      // about it, even after the server had stopped refusing the application.
      await configure('CREDENTIAL_REVIEW', [
        {
          id: 'doc-old',
          type: 'CERTIFICATE',
          verificationStatus: 'REJECTED',
          supersededAt: '2026-09-01T10:00:00Z',
          supersededByDocumentId: 'doc-new',
        },
        { id: 'doc-new', type: 'CERTIFICATE', verificationStatus: 'VERIFIED' },
        { id: 'doc-2', type: 'LICENSE', verificationStatus: 'VERIFIED' },
      ]);

      expect(component.allDocumentsVerified()).toBe(true);
      expect((fixture.nativeElement.querySelector('[data-cy="approve"]') as HTMLButtonElement).disabled).toBe(false);

      // Still listed, and labelled as replaced rather than silently indistinguishable from a live one.
      expect(fixture.nativeElement.querySelectorAll('[data-cy^="document-"]')).toHaveLength(3);
      const archivedRow = fixture.nativeElement.querySelector('[data-cy="document-doc-old"]') as HTMLElement;
      expect(archivedRow.querySelector('[data-cy="supersededBadge"]')).toBeTruthy();

      // A verdict on a credential the applicant has already replaced is meaningless, so neither
      // action is offered on it.
      expect((fixture.nativeElement.querySelector('[data-cy="verify-doc-old"]') as HTMLButtonElement).disabled).toBe(true);
      expect((fixture.nativeElement.querySelector('[data-cy="reject-doc-old"]') as HTMLButtonElement).disabled).toBe(true);
      expect(fixture.nativeElement.querySelector('[data-cy="document-doc-new"]').querySelector('[data-cy="supersededBadge"]')).toBeNull();
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

    /**
     * backlog.md item 46, reported from production: "activating a professional does not work, the
     * card freezes on Activating". The activate call was returning 409 in under a second with the
     * missing requirements named in it, and the page was discarding the whole response — the error
     * arm of `run` was `busy.set(false)` and nothing else, so the spinner cleared and the operator
     * was told nothing at all.
     */
    describe('a refused action is reported to the operator (backlog item 46)', () => {
      /** The problem document `professionalservice` actually sends, captured from the quality stack. */
      const refusal = (status: number, detail: string): HttpErrorResponse =>
        new HttpErrorResponse({
          status,
          url: '/services/professionalservice/api/onboarding/applications/app-1/activate',
          error: {
            detail,
            status,
            title: 'Conflict',
            type: 'https://www.jhipster.tech/problem/problem-with-message',
            message: 'error.http.409',
          },
        });

      it('names every requirement the completeness contract is still missing, in catalogue order', async () => {
        await configure('ROSTER_CONFIGURED');
        api['activate'] = jest.fn(() =>
          throwError(() =>
            // Verbatim, wrapper and all, from PUT .../activate against the quality stack.
            refusal(409, '409 CONFLICT "Activation requires a complete profile; still missing: nextOfKin, profile, address"'),
          ),
        );

        component.activate();

        expect(component.busy()).toBe(false);
        expect(component.actionError()).toEqual({
          messageKey: 'healthConnect.review.error.incompleteProfile',
          // Catalogue order, not the order the service happened to list them in.
          missingRequirements: ['profile', 'address', 'nextOfKin'],
          detail: null,
        });

        fixture.detectChanges();
        const requirements = fixture.nativeElement.querySelectorAll('[data-cy="actionErrorRequirements"] li');
        expect([...requirements].map((li: HTMLElement) => li.textContent?.trim())).toEqual([
          'healthConnect.profile.completion.requirements.profile',
          'healthConnect.profile.completion.requirements.address',
          'healthConnect.profile.completion.requirements.nextOfKin',
        ]);
        // No raw server sentence when the requirement list already explains the refusal.
        expect(fixture.nativeElement.querySelector('[data-cy="actionErrorDetail"]')).toBeNull();
      });

      it('does not read a requirement out of a 409 that names one without missing it', async () => {
        // "Application has no linked profile" is also a 409 and also contains "profile". Matching
        // bare key names would report a missing requirement that nobody is missing.
        await configure('APPROVED');
        api['assignOrganization'] = jest.fn(() => throwError(() => refusal(409, '409 CONFLICT "Application has no linked profile"')));

        component.organizationForm.patchValue({ specialtyCategoryId: 'cat-1' });
        component.assignOrganization();

        expect(component.actionError()).toEqual({
          messageKey: 'healthConnect.review.error.conflict',
          missingRequirements: [],
          // Unwrapped from Spring's `409 CONFLICT "…"`: the status is already the headline.
          detail: 'Application has no linked profile',
        });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-cy="actionErrorDetail"]').textContent).toContain(
          'Application has no linked profile',
        );
      });

      it.each([
        [0, 'healthConnect.review.error.unreachable'],
        [403, 'healthConnect.review.error.forbidden'],
        [404, 'healthConnect.review.error.notFound'],
        [503, 'healthConnect.review.error.failed'],
      ])('maps HTTP %i to a translated headline rather than to silence', async (status, messageKey) => {
        await configure('ROSTER_CONFIGURED');
        api['activate'] = jest.fn(() => throwError(() => refusal(status, '')));

        component.activate();

        expect(component.actionError()?.messageKey).toBe(messageKey);
      });

      it('covers every transition on the page, not activation alone', async () => {
        // The hole was in `run`, so all of these had it; fixing one would have left the rest silent.
        await configure('CREDENTIAL_REVIEW');
        for (const call of ['verifyDocument', 'rejectDocument', 'decide', 'markRosterConfigured', 'activate', 'suspend']) {
          api[call] = jest.fn(() => throwError(() => refusal(403, '403 FORBIDDEN "Not the application owner"')));
        }

        component.decisionForm.patchValue({ reason: 'Blurry scan' });
        for (const action of [
          () => component.verify({ id: 'doc-1', type: 'LICENSE' }),
          () => component.reject({ id: 'doc-1', type: 'LICENSE' }),
          () => component.decide('REJECTED'),
          () => component.markRosterConfigured(),
          () => component.activate(),
          () => component.suspend(),
        ]) {
          component.dismissActionError();
          action();
          expect(component.actionError()?.messageKey).toBe('healthConnect.review.error.forbidden');
          expect(component.busy()).toBe(false);
        }
      });

      it('reports a failed authority grant, whichever of its two calls refused', async () => {
        await configure('ORGANIZATION_ASSIGNED');
        gatewayAdmin.grantAuthority = jest.fn(() => throwError(() => refusal(403, '403 FORBIDDEN "Not allowed"')));
        component.assignAuthority();
        expect(component.actionError()?.messageKey).toBe('healthConnect.review.error.forbidden');

        // The gateway granted it and the api did not record it: an inconsistency worth showing.
        gatewayAdmin.grantAuthority = jest.fn(() => of({ login: 'candidate' }));
        api['markAuthorityAssigned'] = jest.fn(() => throwError(() => refusal(409, '409 CONFLICT "Illegal onboarding transition"')));
        component.assignAuthority();
        expect(component.actionError()).toEqual({
          messageKey: 'healthConnect.review.error.conflict',
          missingRequirements: [],
          detail: 'Illegal onboarding transition',
        });
      });

      it('clears on the next attempt and on an explicit dismiss', async () => {
        await configure('ROSTER_CONFIGURED');
        api['activate'] = jest.fn(() =>
          throwError(() => refusal(409, '409 CONFLICT "Activation requires a complete profile; still missing: photo"')),
        );
        component.activate();
        expect(component.actionError()).not.toBeNull();

        component.dismissActionError();
        expect(component.actionError()).toBeNull();

        component.activate();
        expect(component.actionError()).not.toBeNull();
        api['activate'] = jest.fn(() => of(application('ACTIVE')));
        component.activate();
        expect(component.actionError()).toBeNull();
      });
    });
  });
});
