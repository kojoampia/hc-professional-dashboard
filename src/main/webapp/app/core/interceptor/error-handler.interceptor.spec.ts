import { HttpContext, HttpErrorResponse, HttpHandler, HttpRequest } from '@angular/common/http';
import { throwError } from 'rxjs';

import { EventManager } from 'app/core/util/event-manager.service';

import { ErrorHandlerInterceptor, SKIP_ERROR_ALERT } from './error-handler.interceptor';

describe('Error Handler Interceptor', () => {
  let eventManager: { broadcast: jest.Mock };
  let interceptor: ErrorHandlerInterceptor;

  const handlerFailingWith = (status: number, url = '/services/professionalservice/api/onboarding/profile'): HttpHandler =>
    ({ handle: () => throwError(() => new HttpErrorResponse({ status, url })) }) as unknown as HttpHandler;

  const run = (request: HttpRequest<unknown>, handler: HttpHandler): void => {
    interceptor.intercept(request, handler).subscribe({ error: () => undefined });
  };

  beforeEach(() => {
    eventManager = { broadcast: jest.fn() };
    interceptor = new ErrorHandlerInterceptor(eventManager as unknown as EventManager);
  });

  it('should announce an ordinary failure', () => {
    run(new HttpRequest('GET', '/api/anything'), handlerFailingWith(500));

    expect(eventManager.broadcast).toHaveBeenCalled();
  });

  /**
   * The profile page renders an empty form for a clinician who has no profile document yet, so its
   * 404 is an expected outcome rather than a failure. Before this the page came up correct with
   * "Not found" sitting on top of it.
   */
  it('should stay quiet when the caller opted out', () => {
    const request = new HttpRequest('GET', '/api/onboarding/profile', {
      context: new HttpContext().set(SKIP_ERROR_ALERT, true),
    });

    run(request, handlerFailingWith(404));

    expect(eventManager.broadcast).not.toHaveBeenCalled();
  });

  /** Opting out is per-request; it must not leak into the next one. */
  it('should still announce failures on requests that did not opt out', () => {
    run(new HttpRequest('GET', '/api/onboarding/profile'), handlerFailingWith(404));

    expect(eventManager.broadcast).toHaveBeenCalled();
  });
});
