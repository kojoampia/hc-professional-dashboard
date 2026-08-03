/**
 * Route-change spans, wired to Angular's Router.
 *
 * Kept separate from rum.ts because that file must run BEFORE Angular bootstraps (the document
 * load instrumentation needs the navigation timings) while this needs the injector. rum.ts holds
 * no Angular imports for the same reason.
 */
import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { Span, SpanStatusCode } from '@opentelemetry/api';

import { startRouteSpan } from './rum';

/**
 * Emits one span per navigation, from NavigationStart to whichever of End/Cancel/Error follows.
 *
 * A cancelled navigation is recorded rather than dropped: a guard redirecting away is a normal
 * outcome, but a route that is *always* cancelled is a permissions bug that otherwise looks like
 * the user simply never went there.
 */
export function provideRumRouteTracing(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const router = inject(Router);
    let active: Span | undefined;

    const finish = (status: SpanStatusCode, outcome: string): void => {
      if (!active) {
        return;
      }
      active.setAttribute('navigation.outcome', outcome);
      active.setStatus({ code: status });
      active.end();
      active = undefined;
    };

    router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        // A navigation starting while one is in flight (a guard redirect, or a fast double click)
        // would otherwise orphan the first span and leak it — Tempo would wait out its retention
        // for an end that never comes.
        finish(SpanStatusCode.UNSET, 'superseded');
        active = startRouteSpan(routeTemplateOf(event.url));
      } else if (event instanceof NavigationEnd) {
        finish(SpanStatusCode.OK, 'completed');
      } else if (event instanceof NavigationCancel) {
        finish(SpanStatusCode.UNSET, 'cancelled');
      } else if (event instanceof NavigationError) {
        finish(SpanStatusCode.ERROR, 'failed');
      }
    });
  });
}

/**
 * Reduces a concrete URL to something groupable.
 *
 * Angular's Router does not hand us the matched route path on NavigationStart, so this collapses
 * the segments that vary: numeric ids and UUIDs become `:id`. Without it every professional's page
 * is its own operation name in Tempo, and the query string — which on this application can carry a
 * patient identifier — would end up in the span name, where the collector's scrubbing cannot reach
 * it. Dropping it here is the only place that works.
 */
function routeTemplateOf(url: string): string {
  const path = url.split(/[?#]/)[0];
  return (
    path
      .split('/')
      .map(segment =>
        /^\d+$/.test(segment) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ? ':id' : segment,
      )
      .join('/') || '/'
  );
}
