import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

import { LoginService } from 'app/login/login.service';
import { StateStorageService } from 'app/core/auth/state-storage.service';
import { AccountService } from 'app/core/auth/account.service';

/**
 * Reads the routed microservice name back off a URL.
 *
 * `ApplicationConfigService.getEndpointFor(api, microservice?)` builds every backend URL this app
 * calls: `services/<microservice>/<api>` when a microservice is named, a bare path otherwise. So
 * the answering service is recoverable from the URL alone. Anchored on a segment boundary so it
 * matches the relative form (`services/…`), the rooted form (`/services/…`) and the absolute form
 * Angular resolves before it reaches `HttpErrorResponse.url`.
 */
const ROUTED_SERVICE = /(?:^|\/)services\/([^/?#]+)/;

/**
 * The microservices whose 401 is evidence about *this* portal's session.
 *
 * `professionalservice` is here because it validates the token this gateway issued, with the same
 * key, and distinguishes the two failures: its `BearerTokenAuthenticationEntryPoint` answers 401
 * when the token itself fails validation and its `BearerTokenAccessDeniedHandler` answers 403 when
 * a valid token merely lacks the authority. So a 401 from it really does mean the token is dead.
 *
 * Every other routed service is a different product. The three stacks share one signing key and
 * **not** a user store, so a sibling's 401 is that product's decision about that one call — see
 * `docs/backlog.md` item 156, where an `adminservice` 401 on one dashboard card signed clinicians
 * out of a session whose own `GET /api/account` had answered 200 moments earlier.
 */
const SESSION_AUTHORITATIVE_SERVICES = ['professionalservice'];

/**
 * Whether the service that answered this URL is entitled to end the session.
 *
 * Deliberately keyed on *who answered* rather than on which endpoint was asked. A denylist of
 * sibling endpoints would have to be extended for every new cross-stack call — and the next one
 * missed reintroduces item 156 under a different path. Here an unrecognised routed service is
 * foreign by default, which is the safe direction: the cost of a wrong answer is one 401 that
 * fails to sign a clinician out, against a valid session destroyed.
 *
 * ⚠ Known and accepted: sibling calls are proxied *through* our own gateway, which gates
 * `/services/**` itself, so a genuinely dead token produces a 401 on a sibling URL that is
 * indistinguishable here from the sibling's own refusal. Such a token fails every other call too —
 * including the bare and `professionalservice` ones every screen but `/earnings` makes — so the
 * expiry is still caught. On `/earnings`, whose only backend call is to `adminservice`, it is
 * caught on the next navigation instead. That is the trade item 156 chose: only the issuer of a
 * token may declare it dead, and a late sign-out is worth less harm than a wrongful one.
 */
function canEndTheSession(url: string): boolean {
  const routed = ROUTED_SERVICE.exec(url);
  // A bare path is the gateway itself — the issuer of the token, and the authority on its death.
  return routed === null || SESSION_AUTHORITATIVE_SERVICES.includes(routed[1]);
}

@Injectable()
export class AuthExpiredInterceptor implements HttpInterceptor {
  constructor(
    private loginService: LoginService,
    private stateStorageService: StateStorageService,
    private router: Router,
    private accountService: AccountService,
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap({
        error: (err: HttpErrorResponse) => {
          if (
            err.status === 401 &&
            err.url &&
            canEndTheSession(err.url) &&
            // The login flow probes this endpoint, where a 401 is the expected answer rather than
            // an expiry. Predates item 156 and is kept: narrowing by answering service does not
            // subsume it, since the gateway is exactly the service this exemption is about.
            !err.url.includes('api/account') &&
            this.accountService.isAuthenticated()
          ) {
            this.stateStorageService.storeUrl(this.router.routerState.snapshot.url);
            this.loginService.logout();
            this.router.navigate(['/login']);
          }
        },
      }),
    );
  }
}
