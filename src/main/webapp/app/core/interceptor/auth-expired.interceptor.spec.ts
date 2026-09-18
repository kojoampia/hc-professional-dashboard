import { HttpErrorResponse, HttpHandler, HttpRequest } from '@angular/common/http';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';

import { LoginService } from 'app/login/login.service';
import { StateStorageService } from 'app/core/auth/state-storage.service';
import { AccountService } from 'app/core/auth/account.service';

import { AuthExpiredInterceptor } from './auth-expired.interceptor';

/**
 * The rule under test is "who answered", not "what was asked" — see `docs/backlog.md` item 156,
 * where an `adminservice` 401 on one dashboard card ended a session whose own `GET /api/account`
 * had answered 200 moments before.
 *
 * Every case is one `it`, on purpose. Folded together they redden together, and a failure then
 * cannot say which prefix was classified wrongly — which is the only thing this file exists to
 * pin down.
 */
describe('Auth Expired Interceptor', () => {
  let loginService: { logout: jest.Mock };
  let stateStorageService: { storeUrl: jest.Mock };
  let router: { navigate: jest.Mock; routerState: { snapshot: { url: string } } };
  let accountService: { isAuthenticated: jest.Mock };
  let interceptor: AuthExpiredInterceptor;

  const handlerFailingWith = (status: number, url: string): HttpHandler =>
    ({ handle: () => throwError(() => new HttpErrorResponse({ status, url })) }) as unknown as HttpHandler;

  const requestFailingWith = (status: number, url: string): void => {
    interceptor.intercept(new HttpRequest('GET', url), handlerFailingWith(status, url)).subscribe({ error: () => undefined });
  };

  beforeEach(() => {
    loginService = { logout: jest.fn() };
    stateStorageService = { storeUrl: jest.fn() };
    router = { navigate: jest.fn(), routerState: { snapshot: { url: '/dashboard' } } };
    accountService = { isAuthenticated: jest.fn().mockReturnValue(true) };

    interceptor = new AuthExpiredInterceptor(
      loginService as unknown as LoginService,
      stateStorageService as unknown as StateStorageService,
      router as unknown as Router,
      accountService as unknown as AccountService,
    );
  });

  /**
   * The measured defect: hc-admin answers 401 for the earnings card and the clinician is returned
   * to /login about 2.5 seconds after signing in.
   */
  it('should keep the session when adminservice answers 401', () => {
    requestFailingWith(401, '/services/adminservice/api/professionals/me/earnings');

    expect(loginService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  /**
   * The generalisation the row demands. patientservice's scope-of-practice refusals are the next
   * sibling 401 this app will meet; if only the adminservice path had been exempted, this reddens.
   */
  it('should keep the session when patientservice answers 401', () => {
    requestFailingWith(401, '/services/patientservice/api/clinical-cases');

    expect(loginService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  /** A routed service nobody has added yet is foreign by default, not session-authoritative. */
  it('should keep the session when an unknown routed service answers 401', () => {
    requestFailingWith(401, '/services/vendorservice/api/orders');

    expect(loginService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  /**
   * The inverse failure, and the case without which "never sign anyone out" would look green.
   * A bare path is the gateway that issued the token.
   */
  it('should end the session when the gateway answers 401', () => {
    requestFailingWith(401, '/api/admin/users');

    expect(stateStorageService.storeUrl).toHaveBeenCalledWith('/dashboard');
    expect(loginService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  /**
   * professionalservice validates this gateway's token with the same key and separates the two
   * failures: 401 for a token that failed validation, 403 for a valid token lacking the authority.
   * So its 401 is a genuine expiry.
   */
  it('should end the session when professionalservice answers 401', () => {
    requestFailingWith(401, '/services/professionalservice/api/patients');

    expect(loginService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  /** The pre-existing exemption: the login flow probes this endpoint and its 401 is expected. */
  it('should keep the session when api/account answers 401', () => {
    requestFailingWith(401, '/api/account');

    expect(loginService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  /** Guards against keying on the URL and forgetting the status. A 403 is an authority refusal. */
  it('should keep the session when the gateway answers 403', () => {
    requestFailingWith(403, '/api/admin/users');

    expect(loginService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  /** Nobody is signed in, so there is no session to end. */
  it('should do nothing when no one is authenticated', () => {
    accountService.isAuthenticated.mockReturnValue(false);

    requestFailingWith(401, '/services/professionalservice/api/patients');

    expect(loginService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
