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
        Authority.ANGEL,
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
