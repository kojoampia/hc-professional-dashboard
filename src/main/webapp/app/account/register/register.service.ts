import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { LoginAvailability, Registration } from './register.model';

@Injectable({ providedIn: 'root' })
export class RegisterService {
  constructor(
    private http: HttpClient,
    private applicationConfigService: ApplicationConfigService,
  ) {}

  save(registration: Registration): Observable<{}> {
    return this.http.post(this.applicationConfigService.getEndpointFor('api/register'), registration);
  }

  /**
   * Whether `login` can still be registered, with alternatives when it cannot.
   *
   * Anonymous, like registration itself. The server rejects a syntactically invalid login with a
   * 400, so callers should only ask once the field passes its own validators — otherwise every
   * keystroke of a half-typed name costs a failed request.
   */
  checkLoginAvailability(login: string): Observable<LoginAvailability> {
    return this.http.get<LoginAvailability>(this.applicationConfigService.getEndpointFor('api/register/login-available'), {
      params: { login },
    });
  }
}
