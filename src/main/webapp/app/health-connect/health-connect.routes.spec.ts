import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { Authority } from 'app/config/authority.constants';
import { AccountService } from 'app/core/auth/account.service';
import { StateStorageService } from 'app/core/auth/state-storage.service';
import { UserRouteAccessService } from 'app/core/auth/user-route-access.service';

import { healthConnectRoleGuard } from './authority-role.guard';
import routes from './health-connect.routes';

@Component({
  standalone: true,
  imports: [RouterOutlet],
  selector: 'hpd-health-connect-route-test-host',
  template: '<router-outlet />',
})
class HealthConnectRouteTestHostComponent {}

describe('HealthConnect feature routes', () => {
  const find = (path: string): (typeof routes)[number] => routes.find(route => route.path === path)!;

  it('defines all lazy protected feature entry URLs without replacing generated routes', () => {
    const requiredPaths = ['dashboard', 'patients', 'patients/:patientId', 'cases', 'cases/:caseId', 'duty-roster'];

    for (const path of requiredPaths) {
      const route = find(path);
      expect(route).toBeDefined();
      expect(route.loadComponent).toBeDefined();
      expect(route.canActivate).toEqual([UserRouteAccessService, healthConnectRoleGuard]);
      expect(route.data?.['authorities']).toEqual([Authority.USER]);
    }
  });

  it('keeps patient-scoped and standalone case detail routes available through route-driven overlays', () => {
    const patientDetail = find('patients/:patientId');
    const standaloneCase = find('cases/:caseId');

    expect((patientDetail.children as Routes)[1].path).toBe('cases/:caseId');
    expect(patientDetail.data?.['closeUrl']).toBe('/patients');
    expect(standaloneCase.data?.['closeUrl']).toBe('/cases');
  });

  it('resolves every protected entry URL for an authorized JHipster user', async () => {
    await TestBed.configureTestingModule({
      imports: [HealthConnectRouteTestHostComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter(routes),
        {
          provide: AccountService,
          useValue: {
            identity: jest.fn(() =>
              of({
                activated: true,
                authorities: [Authority.USER],
                email: 'professional@example.test',
                firstName: null,
                langKey: 'en',
                lastName: null,
                login: 'professional',
                imageUrl: null,
              }),
            ),
            getAuthenticationState: jest.fn(() =>
              of({
                activated: true,
                authorities: [Authority.USER],
                email: 'professional@example.test',
                firstName: null,
                langKey: 'en',
                lastName: null,
                login: 'professional',
                imageUrl: null,
              }),
            ),
            hasAnyAuthority: jest.fn(() => true),
          },
        },
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
});
