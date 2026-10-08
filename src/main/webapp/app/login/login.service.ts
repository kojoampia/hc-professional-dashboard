import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { AuthServerProvider } from 'app/core/auth/auth-jwt.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { Login } from './login.model';

@Injectable({ providedIn: 'root' })
export class LoginService {
  constructor(
    private accountService: AccountService,
    private authServerProvider: AuthServerProvider,
    private onboardingProgressService: OnboardingProgressService,
  ) {}

  login(credentials: Login): Observable<Account | null> {
    return this.authServerProvider.login(credentials).pipe(mergeMap(() => this.accountService.identity(true)));
  }

  /**
   * The only sign-out funnel in the app — the sidebar's button and
   * {@link AuthExpiredInterceptor}'s 401 path both come through here.
   *
   * <p>Dropping the cached onboarding progress is done **synchronously, before the request**, and
   * deliberately not beside {@code authenticate(null)} in `complete`: if the sign-out call itself
   * fails, `complete` never fires, and a percentage left behind is the next account's figure. On a
   * shared ward device that is a second clinician reading the first one's completion.
   */
  logout(): void {
    this.onboardingProgressService.clear();
    this.authServerProvider.logout().subscribe({ complete: () => this.accountService.authenticate(null) });
  }
}
