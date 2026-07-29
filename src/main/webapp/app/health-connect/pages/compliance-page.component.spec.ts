import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { Authority } from 'app/config/authority.constants';
import { AlertService } from 'app/core/util/alert.service';

import { ComplianceApiService, ExpiringLicenseDto } from '../api/compliance-api.service';
import routes from '../health-connect.routes';
import CompliancePageComponent from './compliance-page.component';

/**
 * WP7 gate (web side): the ops dashboard surfaces the funnel by status and by
 * attribution source (careers task 145), the expiring-license watchlist with
 * the on-demand sweep, and the audit feed — all behind ROLE_ADMIN.
 */
describe('CompliancePageComponent (WP7)', () => {
  let fixture: ComponentFixture<CompliancePageComponent>;
  let component: CompliancePageComponent;
  let api: Record<'metrics' | 'expiring' | 'sweep' | 'recentEvents', jest.Mock>;

  const lapsed: ExpiringLicenseDto = {
    documentId: 'doc-1',
    profileId: 'prof-1',
    applicationId: 'app-1',
    accountId: 'nurse',
    login: 'nurse',
    expiryDate: '2000-01-01',
    verificationStatus: 'VERIFIED',
  };
  const upcoming: ExpiringLicenseDto = { ...lapsed, documentId: 'doc-2', applicationId: null, expiryDate: '2999-12-31' };

  beforeEach(async () => {
    api = {
      metrics: jest.fn(() =>
        of({ byStatus: { ACTIVE: 3, CREDENTIAL_REVIEW: 1 }, bySource: { 'web-careers': 2, direct: 2 }, expiringLicenses30d: 2 }),
      ),
      expiring: jest.fn(() => of([lapsed, upcoming])),
      sweep: jest.fn(() => of({ expiredLicenses: 1, applicationsSuspended: 1 })),
      recentEvents: jest.fn(() =>
        of([
          { id: 'e-1', applicationId: 'app-1', actor: 'system', fromStatus: 'ACTIVE', toStatus: 'SUSPENDED', reason: 'license-expired' },
        ]),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [CompliancePageComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ComplianceApiService, useValue: api as unknown as ComplianceApiService },
        { provide: AlertService, useValue: { showToast: jest.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CompliancePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('is an admin-only route', () => {
    const compliance = routes.find(r => r.path === 'compliance')!;
    expect(compliance.data?.['authorities']).toEqual([Authority.ADMIN]);
  });

  it('renders the funnel by status and by attribution source, largest first', () => {
    expect(component.statusEntries()).toEqual([
      ['ACTIVE', 3],
      ['CREDENTIAL_REVIEW', 1],
    ]);
    expect(component.sourceEntries()[0]).toEqual(['web-careers', 2]);
    expect(fixture.nativeElement.querySelector('[data-cy="funnelBySource"]').textContent).toContain('web-careers');
  });

  it('marks lapsed licenses distinctly from upcoming expiries and links to the application review', () => {
    expect(component.isLapsed(lapsed)).toBe(true);
    expect(component.isLapsed(upcoming)).toBe(false);
    const section = fixture.nativeElement.querySelector('[data-cy="expiringLicenses"]');
    expect(section.querySelectorAll('a[href="/review/app-1"]').length).toBe(1);
  });

  it('runs the sweep, toasts the outcome, and refreshes the view', () => {
    component.runSweep();
    expect(api.sweep).toHaveBeenCalled();
    expect(TestBed.inject(AlertService).showToast).toHaveBeenCalledWith('healthConnect.toast.sweepDone', { suspended: 1 });
    expect(api.metrics).toHaveBeenCalledTimes(2);
    expect(api.expiring).toHaveBeenCalledTimes(2);
  });

  it('shows the audit feed with the suspension transition', () => {
    expect(fixture.nativeElement.querySelector('[data-cy="auditFeed"]').textContent).toContain('license-expired');
  });
});
