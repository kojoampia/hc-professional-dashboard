import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';

import { AccountService } from 'app/core/auth/account.service';
import { Account } from 'app/core/auth/account.model';
import { StateStorageService } from 'app/core/auth/state-storage.service';

import { healthConnectRoleGuard } from './authority-role.guard';

describe('healthConnectRoleGuard', () => {
  const account: Account = {
    activated: true,
    authorities: ['ROLE_NURSE'],
    email: 'nurse@example.test',
    firstName: 'Nurse',
    langKey: 'en',
    lastName: 'Example',
    login: 'nurse',
    imageUrl: null,
  };
  const router = { navigate: jest.fn() };
  const stateStorage = { storeUrl: jest.fn() };
  const route = (data: Record<string, unknown>): ActivatedRouteSnapshot => ({ data }) as ActivatedRouteSnapshot;
  const state = { url: '/cases/case-kojo-urgent' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: StateStorageService, useValue: stateStorage },
        { provide: AccountService, useValue: { identity: jest.fn(() => of(account)) } },
      ],
    });
    jest.clearAllMocks();
  });

  it('permits approved clinical mutations', done => {
    TestBed.runInInjectionContext(() =>
      (healthConnectRoleGuard(route({ healthConnectPermission: 'manageCase' }), state) as Observable<boolean>).subscribe(result => {
        expect(result).toBe(true);
        done();
      }),
    );
  });

  it('redirects a read-only role from a mutation route', done => {
    TestBed.inject(AccountService).identity = jest.fn(() => of({ ...account, authorities: ['ROLE_USER'] }));

    TestBed.runInInjectionContext(() =>
      (healthConnectRoleGuard(route({ healthConnectPermission: 'manageReport' }), state) as Observable<boolean>).subscribe(result => {
        expect(result).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['accessdenied']);
        done();
      }),
    );
  });
});
