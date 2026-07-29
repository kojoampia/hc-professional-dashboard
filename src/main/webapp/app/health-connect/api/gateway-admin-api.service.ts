import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';

export interface AdminUserDto {
  id?: string | null;
  login: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  activated?: boolean;
  langKey?: string | null;
  authorities?: string[];
}

/**
 * Thin client for the gateway's stock JHipster user-management API — WP5 uses
 * it to assign the approved clinical authority (the gateway owns authorities;
 * the api service only records the AUTHORITY_ASSIGNED state).
 */
@Injectable({ providedIn: 'root' })
export class GatewayAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly applicationConfigService = inject(ApplicationConfigService);
  private readonly resourceUrl = this.applicationConfigService.getEndpointFor('api/admin/users');

  getUser(login: string): Observable<AdminUserDto> {
    return this.http.get<AdminUserDto>(`${this.resourceUrl}/${encodeURIComponent(login)}`);
  }

  /** Adds the approved clinical authority to the user's existing set (keeps ROLE_USER etc.). */
  grantAuthority(login: string, authority: string): Observable<AdminUserDto> {
    return this.getUser(login).pipe(
      switchMap(user => {
        const authorities = Array.from(new Set([...(user.authorities ?? []), authority]));
        return this.http.put<AdminUserDto>(this.resourceUrl, { ...user, authorities });
      }),
    );
  }
}
