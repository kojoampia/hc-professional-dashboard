import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { AuthServerProvider } from 'app/core/auth/auth-jwt.service';
import { OnboardingProgressService } from 'app/onboarding/onboarding-progress.service';
import { clearWizardProfileId } from 'app/onboarding/wizard.service';
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
   *
   * <p>⛔ **The wizard's step cursor goes with it, and for a sharper version of the same reason.**
   * {@code sessionStorage} survives a sign-out, so without this line the key written by step 2
   * outlived the session that wrote it — and the next account in that tab would have had step 3 adopt
   * the previous clinician's profile id. The argument above is about a completion *percentage*; this
   * one is about a stored identifier, so it is strictly stronger. Same placement, for the same
   * reason: before the request, not in `complete`.
   */
  logout(): void {
    this.onboardingProgressService.clear();
    clearWizardProfileId();
    this.authServerProvider.logout().subscribe({ complete: () => this.accountService.authenticate(null) });
  }
}
