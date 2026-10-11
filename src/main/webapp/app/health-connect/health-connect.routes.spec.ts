import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { Authority } from 'app/config/authority.constants';
import { AccountService } from 'app/core/auth/account.service';
import { StateStorageService } from 'app/core/auth/state-storage.service';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';
import { WIZARD_PANES, wizardPanePath, wizardPaneRoute } from 'app/onboarding/wizard.service';

import { healthConnectRoleGuard } from './authority-role.guard';
import routes from './health-connect.routes';
import { FakeHealthConnectRepository } from './testing/fake-health-connect.repository';
import { HEALTH_CONNECT_REPOSITORY } from './health-connect.repository';

@Component({
  standalone: true,
  imports: [RouterOutlet],
  selector: 'hpd-health-connect-route-test-host',
  template: '<router-outlet />',
})
class HealthConnectRouteTestHostComponent {}

/** A JHipster account that clears both guards, shared by the two routing tests below. */
const authorizedAccount = () => {
  const account = {
    activated: true,
    authorities: [Authority.USER],
    email: 'professional@example.test',
    firstName: null,
    langKey: 'en',
    lastName: null,
    login: 'professional',
    imageUrl: null,
  };
  return {
    identity: jest.fn(() => of(account)),
    getAuthenticationState: jest.fn(() => of(account)),
    hasAnyAuthority: jest.fn(() => true),
  };
};

describe('HealthConnect feature routes', () => {
  const find = (path: string): (typeof routes)[number] => routes.find(route => route.path === path)!;

  it('defines all lazy protected feature entry URLs without replacing generated routes', () => {
    // The record overlays are CHILDREN of their lists now, so they are not in this list; the
    // guards and authorities they need come from the parent that renders them.
    const requiredPaths = ['dashboard', 'patients', 'cases', 'duty-roster'];

    for (const path of requiredPaths) {
      const route = find(path);
      expect(route).toBeDefined();
      expect(route.loadComponent).toBeDefined();
      expect(route.canActivate).toEqual([UserRouteAccessService, healthConnectRoleGuard]);
      expect(route.data?.['authorities']).toEqual([
        Authority.ADMIN,
        Authority.DOCTOR,
        Authority.USER,
        Authority.NURSE,
        Authority.PARAMEDIC,
        Authority.PHARMACIST,
        Authority.THERAPIST,
        Authority.CARER,
        Authority.CHEMIST,
        Authority.TECHNICIAN,
      ]);
    }
  });

  /**
   * The overlays hang off their lists rather than sitting beside them. Flattening this back is the
   * regression: as siblings, opening a record unmounted the list that opened it, so the queue
   * vanished behind the modal and came back rebuilt and unfiltered.
   */
  it('nests both record overlays under the list that opens them', () => {
    const patientDetail = (find('patients').children as Routes)[0];
    const caseDetail = (find('cases').children as Routes)[0];

    expect(patientDetail.path).toBe(':patientId');
    expect(patientDetail.data?.['closeUrl']).toBe('/patients');
    expect((patientDetail.children as Routes)[1].path).toBe('cases/:caseId');

    expect(caseDetail.path).toBe(':caseId');
    expect(caseDetail.data?.['closeUrl']).toBe('/cases');
  });

  /**
   * ⭐ **The onboarding wizard's four panes** — `profile.md` § "Onboarding Wizard", T8.
   *
   * <p>Children of `dashboard`, because `profile.md:171-173` opens step 1's dialog *over the
   * dashboard* and the overlay idiom above makes an overlay a child of the page it overlays. Siblings
   * of each other, so each carries its own title and each is a URL the browser's back button steps
   * between — which is how `profile.md:166`'s *"it should be possible to navigate back to a previous
   * step"* is answered by the router rather than by state.
   *
   * <p>Derived from `WIZARD_PANES` rather than listed, so the sequence has one declaration.
   */
  it('mounts the four wizard panes as overlays under the dashboard', () => {
    const panes = find('dashboard').children as Routes;

    expect(panes.map(pane => pane.path)).toEqual(WIZARD_PANES.map(pane => wizardPaneRoute(pane)));
    for (const [index, pane] of panes.entries()) {
      expect(pane.loadComponent).toBeDefined();
      // The overlay host, with the pane component as its only child — the shape the record overlays
      // above use. A pane mounted directly would render inline on the dashboard, not as a dialog.
      expect(pane.data?.['closeUrl']).toBe('/dashboard');
      expect(pane.data?.['titleKey']).toBe(`healthConnect.onboarding.wizard.${WIZARD_PANES[index]}.title`);
      expect(pane.children).toHaveLength(1);
      expect((pane.children as Routes)[0].path).toBe('');
      expect((pane.children as Routes)[0].loadComponent).toBeDefined();
    }
  });

  /**
   * ⛔ **The panes must stay reachable by `ROLE_USER` and nothing else**, which is the whole reason
   * onboarding can live inside the portal: an applicant holds that authority alone until an
   * administrator assigns a discipline. Narrowing these to clinical roles would lock the wizard away
   * from the only people it exists for. The gate is the dashboard's, which they inherit.
   *
   * <p>⚠ **What this does NOT say, because a route table cannot say it.** `protectedFeatureRoute`
   * lists `Authority.USER` on `/patients`, `/cases` and `/duty-roster` as well, so a
   * `ROLE_USER`-only account **resolves those routes too** — measured in review, and the reason the
   * sentence this docblock used to carry about "every other clinical surface" is corrected in
   * `health-connect.routes.ts`. An applicant is refused by `api/`'s chain answering **403** on the
   * reads those pages make, and is not *offered* them because the sidebar's `clinicalOnly` hides the
   * group. ⛔ Route authorities decide what renders, not what is permitted: nobody may drop a
   * server-side check or the sidebar's hiding on the strength of a case in this file.
   */
  it('reaches the wizard panes through the dashboard gate, which admits ROLE_USER', () => {
    const dashboard = find('dashboard');

    expect(dashboard.data?.['authorities']).toContain(Authority.USER);
    // Not re-gated per pane: a second, narrower rule here is how one of the four would drift.
    for (const pane of dashboard.children as Routes) {
      expect(pane.canActivate).toBeUndefined();
      expect(pane.data?.['authorities']).toBeUndefined();
    }
  });

  /**
   * ⚠ The panes live under `dashboard/`, so they cannot collide with the top-level `/onboarding`
   * redirect — which has no component, is the activation email's landing spot, and is **T6's to
   * re-point**, not T8's.
   */
  it('does not claim the top-level onboarding path', () => {
    expect(routes.find(route => route.path === 'onboarding')).toBeUndefined();
    for (const pane of WIZARD_PANES) {
      expect(wizardPanePath(pane).startsWith('/dashboard/')).toBe(true);
    }
  });

  it('resolves every protected entry URL for an authorized JHipster user', async () => {
    await TestBed.configureTestingModule({
      imports: [HealthConnectRouteTestHostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: AccountService, useValue: authorizedAccount() },
        { provide: StateStorageService, useValue: { storeUrl: jest.fn() } },
      ],
    }).compileComponents();
    const fixture: ComponentFixture<HealthConnectRouteTestHostComponent> = TestBed.createComponent(HealthConnectRouteTestHostComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    for (const url of [
      '/dashboard',
      '/patients',
      '/patients/patient-1',
      '/patients/patient-1/cases/case-1',
      '/cases',
      '/cases/case-1',
      '/duty-roster',
    ]) {
      await router.navigateByUrl(url);
      expect(router.url).toBe(url);
    }
  });

  it('leaves the list rendered underneath while a record overlay is open', async () => {
    await TestBed.configureTestingModule({
      imports: [HealthConnectRouteTestHostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: HEALTH_CONNECT_REPOSITORY, useExisting: FakeHealthConnectRepository },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: AccountService, useValue: authorizedAccount() },
        { provide: StateStorageService, useValue: { storeUrl: jest.fn() } },
      ],
    }).compileComponents();
    const fixture: ComponentFixture<HealthConnectRouteTestHostComponent> = TestBed.createComponent(HealthConnectRouteTestHostComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    await router.navigateByUrl('/cases');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hpd-case-queue__scope')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

    await router.navigateByUrl('/cases/case-1');
    fixture.detectChanges();
    // Both at once. The queue is still there — that is the whole point of the nesting.
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.hpd-case-queue__scope')).not.toBeNull();
  });
});
