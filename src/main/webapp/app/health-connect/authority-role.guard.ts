import { inject, isDevMode } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs/operators';

import { AccountService } from 'app/core/auth/account.service';
import { StateStorageService } from 'app/core/auth/state-storage.service';

import { hasHealthConnectPermission, hasHealthConnectRole, HealthConnectPermission } from './authority-role';
import { AuthorityRole } from './health-connect.models';

export interface HealthConnectRouteAccess {
  healthConnectRoles?: AuthorityRole[];
  healthConnectPermission?: HealthConnectPermission;
}

export const healthConnectRoleGuard: CanActivateFn = (next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const accountService = inject(AccountService);
  const router = inject(Router);
  const stateStorageService = inject(StateStorageService);
  const access = next.data as HealthConnectRouteAccess;

  return accountService.identity().pipe(
    map(account => {
      if (!account) {
        stateStorageService.storeUrl(state.url);
        router.navigate(['/login']);
        return false;
      }

      const permittedByRole = !access.healthConnectRoles?.length || hasHealthConnectRole(account.authorities, access.healthConnectRoles);
      const permittedByAction =
        !access.healthConnectPermission || hasHealthConnectPermission(account.authorities, access.healthConnectPermission);
      if (permittedByRole && permittedByAction) {
        return true;
      }

      if (isDevMode()) {
        console.error('User does not have approved HealthConnect access for route', state.url);
      }
      router.navigate(['accessdenied']);
      return false;
    }),
  );
};
