import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpErrorResponse, HttpHandler, HttpEvent, HttpContextToken } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { EventManager, EventWithContent } from 'app/core/util/event-manager.service';

/**
 * Set on a request whose failures the caller reports itself.
 *
 * <p>The interceptor otherwise raises a banner for every HTTP error, which is right when nothing
 * else is watching and wrong when the caller treats the failure as an ordinary outcome. The case
 * that forced it: {@code GET /api/onboarding/profile} 404s for a clinician who has no profile
 * document yet — an admin invitation creates the login first — and the profile page answers that
 * with an empty form. Without this the page rendered correctly and put "Not found" on top of it.
 */
export const SKIP_ERROR_ALERT = new HttpContextToken(() => false);

@Injectable()
export class ErrorHandlerInterceptor implements HttpInterceptor {
  constructor(private eventManager: EventManager) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap({
        error: (err: HttpErrorResponse) => {
          if (request.context.get(SKIP_ERROR_ALERT)) {
            return;
          }
          if (!(err.status === 401 && (err.message === '' || err.url?.includes('api/account')))) {
            this.eventManager.broadcast(new EventWithContent('professionalGatewayApp.httpError', err));
          }
        },
      }),
    );
  }
}
